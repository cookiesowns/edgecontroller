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
import withStyles from '@material-ui/core/styles/withStyles';
import { withRouter } from "react-router-dom";
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import CardItem from '../components/cards/CardItem';
import Topbar from '../components/Topbar';
import CircularLoader from "../components/progressbars/FullSizeCircularLoader";
import ApiClient from "../api/ApiClient";
import AddAppFormDialog from "../components/forms/AddAppFormDialog";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import AddIcon from '@material-ui/icons/Add';
import { withSnackbar } from 'notistack';

const styles = theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.grey['A500'],
    overflow: 'hidden',
    backgroundSize: 'cover',
    backgroundPosition: '0 400px',
    marginTop: 20,
    padding: 20,
    paddingBottom: 200
  },
  grid: {
    width: 1000
  },
  rightIcon: {
    marginLeft: '5px',
    marginRight: '0',
    fontSize: '20px',
  },
  sectionContainer: {
    marginTop: theme.spacing.unit * 4,
    marginBottom: theme.spacing.unit * 4
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    display: 'inline-block',
  },
  addButton: {
    float: 'right',
  },
});

class AppsView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false,
      showAddForm: false,
      apps: {}
    };
  }

  fetchApps = () => {
    return ApiClient.get('/apps').then((resp) => {
      this.setState({ loaded: true, apps: resp.data.apps })
    }).catch((err) => {
      this.setState({ loaded: true });
      this.props.enqueueSnackbar(`${err.toString()}. Please try again later.`, { variant: 'error' });
    });
  };

  handleClickOpen = () => {
    this.setState({ showAddForm: !this.state.showAddForm });
  };

  handleParentClose = () => {
    this.setState({ showAddForm: false });
  };

  handleParentRefresh = () => {
    this.setState({ loaded: false });
    this.fetchApps();
  };

  componentDidMount() {
    this.fetchApps();
  }

  render() {
    const { location: { pathname: currentPath }, classes } = this.props;

    const renderAddNodeForm = () => {
      return (
        <AddAppFormDialog
          open={this.state.showAddForm}
          handleParentClose={this.handleParentClose}
          handleParentRefresh={this.handleParentRefresh}
        />
      );
    };

    const renderApps = () => {
      const { apps } = this.state;

      if (!apps) {
        return;
      }

      return Object.keys(apps).map(key => {
        return (
          <CardItem
            resourcePath="/apps"
            key={apps[key].id}
            CardItem={apps[key]}
            dialogText="This will permanently delete the application from the controller"
            excludeKeys={[]}
          />
        )
      })
    };

    const appsGrid = () => (
      <Grid spacing={24} alignItems="center" justify="center" container className={classes.grid}>
        <Grid item xs={12}>
          <Grid container direction="row"
            justify="space-between"
            alignItems="flex-start"
            className={classes.sectionContainer}
          >
            <Grid item>
              <Typography variant="subtitle1" className={classes.title}>
                Applications
                </Typography>
              <Typography variant="body1" gutterBottom className={classes.subtitle}>
                List of Applications
                </Typography>
            </Grid>
            <Grid item xs={3}>
              <Button variant="contained" color="primary" className={classes.addButton} onClick={this.handleClickOpen}>
                Add Application
                  <AddIcon className={classes.rightIcon} />
              </Button>
            </Grid>
          </Grid>
          {renderApps()}
        </Grid>
      </Grid>
    );

    const circularLoader = () => (
      <CircularLoader />
    );

    return (
      <React.Fragment>
        <CssBaseline />
        <Topbar currentPath={currentPath} />
        <div className={classes.root}>
          <Grid container justify="center">
            {this.state.loaded ? appsGrid() : circularLoader()}
            {renderAddNodeForm()}
          </Grid>
        </div>
      </React.Fragment>
    )
  }
}

export default withSnackbar(withRouter(withStyles(styles)(AppsView)));
