// Copyright 2019 Smart-Edge.com, Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package k8s_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path"
	"regexp"
	"strings"
	"testing"
	"time"

	"k8s.io/client-go/tools/clientcmd"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/onsi/gomega/gbytes"
	"github.com/onsi/gomega/gexec"
	"google.golang.org/grpc/grpclog"

	cce "github.com/smartedgemec/controller-ce"
)

const adminPass = "word"

var (
	ctrl   *gexec.Session
	node   *gexec.Session
	apiCli *apiClient

	controllerRootPEM []byte
)

var _ = BeforeSuite(func() {
	logger := grpclog.NewLoggerV2(
		GinkgoWriter, GinkgoWriter, GinkgoWriter)
	grpclog.SetLoggerV2(logger)
	startup()

	// label node with correct serial
	Expect(exec.Command("kubectl", "label", "nodes", "minikube", "node-uuid=minikube").Run()).To(Succeed())
})

var _ = AfterSuite(func() {
	shutdown()
	// un-label node with serial
	Expect(exec.Command("kubectl", "label", "nodes", "minikube", "node-uuid-").Run()).To(Succeed())
})

func TestApplicationClient(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Controller CE K8S API Suite")
}

func startup() {
	By("Building the controller")
	exe, err := gexec.Build("github.com/smartedgemec/controller-ce/cmd/cce")
	Expect(err).ToNot(HaveOccurred(), "Problem building service")

	u, err := user.Current()
	Expect(err).NotTo(HaveOccurred())
	kubeConfig := path.Join(u.HomeDir, ".kube", "config")

	config, err := clientcmd.BuildConfigFromFlags("", kubeConfig)
	Expect(err).NotTo(HaveOccurred())

	cmd := exec.Command(exe,
		"-dsn", "root:beer@tcp(:8083)/controller_ce",
		"-httpPort", "8080",
		"-grpcPort", "8081",
		"-syslog-path", "./temp_telemetry/syslog.out",
		"-statsd-path", "./temp_telemetry/statsd.out",
		"-adminPass", adminPass,
		"-orchestration-mode", "kubernetes",
		"-k8s-client-ca-path", config.TLSClientConfig.CAFile,
		"-k8s-client-cert-path", config.TLSClientConfig.CertFile,
		"-k8s-client-key-path", config.TLSClientConfig.KeyFile,
		"-k8s-master-host", config.Host,
		"-k8s-api-path", config.APIPath,
		"-k8s-master-user", config.Username,
	)

	By("Starting the controller in kubernetes orchestration mode")
	ctrl, err = gexec.Start(cmd, GinkgoWriter, GinkgoWriter)
	Expect(err).ToNot(HaveOccurred(), "Problem starting service in kubernetes orchestration mode")

	By("Reading the Controller self-signed CA from output")
	Eventually(ctrl.Err, 3).Should(gbytes.Say(
		`-----END CERTIFICATE-----`),
		"Service did not print CA cert in time")
	certMatches := regexp.MustCompile(
		`(?s)-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----`,
	).FindAll(ctrl.Err.Contents(), -1)
	Expect(certMatches).To(HaveLen(1),
		"Service did not print a single CA cert")
	controllerRootPEM = certMatches[0]

	By("Verifying that the controller started successfully")
	Eventually(ctrl.Err, 3).Should(gbytes.Say(
		"Controller CE ready"),
		"Service did not start in time")

	By("Requesting an authentication token from the controller")
	apiCli = &apiClient{
		Token: authToken(),
	}

	By("Building the node")
	exe, err = gexec.Build(
		"github.com/smartedgemec/controller-ce/test/node/grpc")
	Expect(err).ToNot(HaveOccurred(), "Problem building node")

	cmd = exec.Command(exe,
		"-port", "8082")

	By("Starting the node")
	node, err = gexec.Start(cmd, GinkgoWriter, GinkgoWriter)
	Expect(err).ToNot(HaveOccurred(), "Problem starting node")

	By("Verifying that the node started successfully")
	Eventually(node.Err, 3).Should(gbytes.Say(
		"test-node: listening on port: 8082"),
		"Node did not start in time")
}

func shutdown() {
	if ctrl != nil {
		By("Stopping the controller service")
		ctrl.Kill()
	}
	if node != nil {
		By("Stopping the test node")
		node.Kill()
	}
	os.RemoveAll("./temp_telemetry")
}

func authToken() string {
	payload, err := json.Marshal(
		struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}{"admin", adminPass})
	Expect(err).ToNot(HaveOccurred())

	req, err := http.NewRequest(
		http.MethodPost,
		"http://localhost:8080/auth",
		bytes.NewReader(payload),
	)
	Expect(err).ToNot(HaveOccurred())

	resp, err := new(http.Client).Do(req)
	Expect(err).ToNot(HaveOccurred())
	defer resp.Body.Close()

	Expect(resp.StatusCode).To(Equal(http.StatusCreated))

	var auth struct {
		Token string `json:"token"`
	}
	Expect(json.NewDecoder(resp.Body).Decode(&auth)).To(Succeed())
	Expect(auth.Token).ToNot(BeEmpty())

	return auth.Token
}

type respBody struct {
	ID string
}

func postApps(appType string) (id string) {
	By("Sending a POST /apps request")
	resp, err := apiCli.Post(
		"http://127.0.0.1:8080/apps",
		"application/json",
		strings.NewReader(fmt.Sprintf(`
			{
				"type": "%s",
				"name": "%s app",
				"version": "latest",
				"vendor": "smart edge",
				"description": "my %s app",
				"cores": 4,
				"memory": 1024,
				"source": "http://www.test.com/my_%s_app.tar.gz",
				"ports": [{"port": 80, "protocol": "tcp"}]
			}`, appType, appType, appType, appType)))
	Expect(err).ToNot(HaveOccurred())
	defer resp.Body.Close()

	By("Verifying a 201 Created response")
	Expect(resp.StatusCode).To(Equal(http.StatusCreated))

	By("Reading the response body")
	body, err := ioutil.ReadAll(resp.Body)
	Expect(err).ToNot(HaveOccurred())

	var rb respBody

	By("Unmarshalling the response")
	Expect(json.Unmarshal(body, &rb)).To(Succeed())

	return rb.ID
}

func postNodes() (id string) {
	By("Sending a POST /nodes request")
	resp, err := apiCli.Post(
		"http://127.0.0.1:8080/nodes",
		"application/json",
		strings.NewReader(`
			{
				"name": "Test-Node-1",
				"location": "Localhost port 8082",
				"serial": "minikube",
				"grpc_target": "127.0.0.1:8082"
			}`))
	Expect(err).ToNot(HaveOccurred())
	defer resp.Body.Close()

	By("Verifying a 201 Created response")
	Expect(resp.StatusCode).To(Equal(http.StatusCreated))

	By("Reading the response body")
	body, err := ioutil.ReadAll(resp.Body)
	Expect(err).ToNot(HaveOccurred())

	By("Unmarshalling the response")
	var rb respBody
	Expect(json.Unmarshal(body, &rb)).To(Succeed())

	return rb.ID
}

func postNodesApps(nodeID, appID string) (id string) {
	By("Sending a POST /nodes_apps request")
	resp, err := apiCli.Post(
		"http://127.0.0.1:8080/nodes_apps",
		"application/json",
		strings.NewReader(fmt.Sprintf(`
			{
				"node_id": "%s",
				"app_id": "%s"
			}`, nodeID, appID)))
	Expect(err).ToNot(HaveOccurred())
	defer resp.Body.Close()

	By("Verifying a 201 Created response")
	Expect(resp.StatusCode).To(Equal(http.StatusCreated))

	By("Reading the response body")
	body, err := ioutil.ReadAll(resp.Body)
	Expect(err).ToNot(HaveOccurred())

	By("Unmarshalling the response")
	var rb respBody
	Expect(json.Unmarshal(body, &rb)).To(Succeed())

	By("Verify deployment success")
	count := 0
	Eventually(func() []*cce.NodeAppResp {
		count++
		By(fmt.Sprintf("Attempt #%d: Verifying if k8s deployment status is deployed", count))
		nodeAppsResp := getNodeApps(nodeID)
		return nodeAppsResp

	}, 15*time.Second, 1*time.Second).Should(ContainElement(
		&cce.NodeAppResp{
			NodeApp: cce.NodeApp{
				ID:     rb.ID,
				NodeID: nodeID,
				AppID:  appID,
			},
			Status: "deployed",
		},
	))

	return rb.ID
}

func getNodeApp(id string) *cce.NodeAppResp {
	By("Sending a GET /nodes_apps/{id} request")
	resp, err := apiCli.Get(
		fmt.Sprintf("http://127.0.0.1:8080/nodes_apps/%s", id))

	By("Verifying a 200 OK response")
	Expect(err).ToNot(HaveOccurred())
	defer resp.Body.Close()
	Expect(resp.StatusCode).To(Equal(http.StatusOK))

	By("Reading the response body")
	body, err := ioutil.ReadAll(resp.Body)
	Expect(err).ToNot(HaveOccurred())

	var nodeAppResp cce.NodeAppResp

	By("Unmarshalling the response")
	Expect(json.Unmarshal(body, &nodeAppResp)).To(Succeed())

	return &nodeAppResp
}

func getNodeApps(nodeID string) []*cce.NodeAppResp {
	By("Sending a GET /nodes_apps request")
	resp, err := apiCli.Get(
		fmt.Sprintf("http://127.0.0.1:8080/nodes_apps?node_id=%s", nodeID))

	By("Verifying a 200 OK response")
	Expect(err).ToNot(HaveOccurred())
	defer resp.Body.Close()
	Expect(resp.StatusCode).To(Equal(http.StatusOK))

	By("Reading the response body")
	body, err := ioutil.ReadAll(resp.Body)
	Expect(err).ToNot(HaveOccurred())

	By("Unmarshalling the response")
	var nodeAppsResp []*cce.NodeAppResp
	Expect(json.Unmarshal(body, &nodeAppsResp)).To(Succeed())

	return nodeAppsResp
}