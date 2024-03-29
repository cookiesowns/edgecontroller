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
import axios from 'axios';
import Loader from './Loader';
import { withStyles } from '@material-ui/core/styles';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Typography,
  Grid,
  Paper,
} from '@material-ui/core';

const baseURL = (process.env.NODE_ENV === 'production') ? process.env.REACT_APP_CUPS_API : '/api';

const styles = theme => ({
  paper: {
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 2,
    [theme.breakpoints.up(600 + theme.spacing.unit * 3 * 2)]: {
      marginTop: theme.spacing.unit * 6,
      marginBottom: theme.spacing.unit * 6,
      padding: theme.spacing.unit * 3,
    },
  },
});

class Userplanes extends Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    this.state = {
      loaded: false,
      hasError: false,
      userplanes: [],
    };
  }

  _cancelIfUnmounted = (action) => {
    if (this._isMounted) {
      action();
    }
  }

  _getUserplanes = async () => {
    try {
      const response = await axios.get(`${baseURL}/userplanes`);

      return response.data.userplanes || [];
    } catch (error) {
      console.error("Unable to get userplanes: " + error.toString());
      throw error;
    }
  }

  componentWillUnmount() {
    // Signal to cancel any pending async requests to prevent setting state
    // on an unmounted component.
    this._isMounted = false;
  }

  async componentDidMount() {
    this._isMounted = true;

    try {
      // Fetch userplanes.
      const userplanes = await this._getUserplanes() || [];

      // Update userplanes iff the component is mounted.
      this._cancelIfUnmounted(() => this.setState({
        loaded: true,
        userplanes: userplanes,
      }));
    } catch (error) {
      // Update error iff the component is mounted.
      this._cancelIfUnmounted(() => this.setState({
        loaded: true,
        hasError: true,
        error: error,
      }));
    }
  }

  render() {
    const {
      classes,
      match,
      history,
    } = this.props;

    const {
      loaded,
      hasError,
      error,
      userplanes,
    } = this.state;

    if (!loaded) {
      return <Loader />;
    }

    if (hasError) {
      throw error;
    }

    const UserplaneTableRow = ({ match, history, item }) => {
      return (
        <TableRow>
          <TableCell>
            {item.id}
          </TableCell>
          <TableCell>
            {item.uuid}
          </TableCell>
          <TableCell>
            {item.function}
          </TableCell>
          <TableCell>
            <Button
              onClick={() => history.push(`${match.url}/${item.id}`)}
              variant="outlined"
            >
              Edit
              </Button>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <Paper className={classes.paper}>
        <Grid
          container
          direction="row"
          justify="space-between"
          alignItems="flex-end"
        >
          <Grid item>
            <Typography
              component="h1"
              variant="h5"
              gutterBottom
            >
              Userplanes
                </Typography>
          </Grid>

          <Grid item>
            <Button
              onClick={() => history.push(`${match.url}/create`)}
              variant="outlined"
              color="primary"
            >
              Create
                </Button>
          </Grid>
        </Grid>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>UUID</TableCell>
              <TableCell>Function</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              userplanes.length === 0
                ? <div>No userplanes to display.</div>
                : userplanes.map(item => <UserplaneTableRow
                  key={item.id}
                  item={item}
                  history={history}
                  match={match} />)
            }
          </TableBody>
        </Table>
      </Paper >
    );
  }
};

export default withStyles(styles)(Userplanes);
