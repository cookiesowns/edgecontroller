// Copyright 2019 Intel Corporation and Smart-Edge.com, Inc. All rights reserved
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

import React, { Component } from 'react';
import ApiClient from '../../api/ApiClient';
import { SchemaForm, utils } from 'react-schema-form';
import NodeSchema from '../../components/schema/Node';
import { withSnackbar } from 'notistack';
import {
  Grid,
  Button
} from '@material-ui/core';
class DashboardView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false,
      error: null,
      showErrors: true,
      node: {},
    };
  }

  // GET /nodes/:node_id
  getNode = () => {
    const { nodeID } = this.props;

    ApiClient.get(`/nodes/${nodeID}`)
      .then((resp) => {
        this.setState({
          loaded: true,
          node: resp.data,
        })
      })
      .catch((err) => {
        this.setState({ loaded: true });
        this.props.enqueueSnackbar(`${err.toString()}. Please try again later.`, { variant: 'error' });
      });
  }

  // PATCH /nodes/:node_id
  updateNode = () => {
    const { nodeID } = this.props;
    const { node } = this.state;

    ApiClient.patch(`/nodes/${nodeID}`, node)
      .then((resp) => {
        this.setState({ loaded: true });
        this.props.enqueueSnackbar(`Successfully updated node.`, { variant: 'success' });
      })
      .catch((err) => {
        this.setState({ loaded: true });
        this.props.enqueueSnackbar(`${err.toString()}. Please try again later.`, { variant: 'error' });
      });
  }

  onModelChange = (key, val) => {
    const { node } = this.state;

    const newNode = node;

    utils.selectOrSet(key, newNode, val);

    this.setState({ node: newNode });
  }

  componentDidMount() {
    this.getNode();
  }

  render() {
    const {
      loaded,
      showErrors,
      node,
    } = this.state;

    if (!loaded) {
      return <React.Fragment>Loading ...</React.Fragment>
    }

    return (
      <React.Fragment>
        <Grid
          container
          justify="space-between"
          alignItems="flex-end"
          spacing={40}
        >
          <Grid item xs={12}>
            <SchemaForm
              schema={NodeSchema.schema}
              form={NodeSchema.form}
              model={node}
              onModelChange={this.onModelChange}
              showErrors={showErrors}
            />
          </Grid>
          <Grid item xs={12} style={{ textAlign: 'right' }}>
            <Button
              onClick={this.updateNode}
              variant="outlined"
              color="primary"
            >
              Save
            </Button>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }
};


export default withSnackbar(DashboardView);
