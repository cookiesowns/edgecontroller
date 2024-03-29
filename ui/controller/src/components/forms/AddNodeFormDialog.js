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
import ApiClient from '../../api/ApiClient';
import CircularLoader from '../progressbars/FullSizeCircularLoader';
import Button from '@material-ui/core/Button/index';
import TextField from '@material-ui/core/TextField/index';
import Dialog from '@material-ui/core/Dialog/index';
import DialogActions from '@material-ui/core/DialogActions/index';
import DialogContent from '@material-ui/core/DialogContent/index';
import DialogContentText from '@material-ui/core/DialogContentText/index';
import DialogTitle from '@material-ui/core/DialogTitle/index';
import FormHelperText from "@material-ui/core/FormHelperText";
import { withSnackbar } from 'notistack';

const styles = theme => ({
  circularLoaderContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});

class AddNodeFormDialog extends Component {

  constructor(props) {
    super(props);

    const { open, handleParentClose, handleParentRefresh } = this.props;

    this.state = {
      open: open,
      loading: false,
      helperText: null,
    };

    this.handleDialogClose = this.handleDialogClose.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddNodeSubmit = this.handleAddNodeSubmit.bind(this);
    this.handleParentRefresh = handleParentRefresh.bind(this);
    this.handleParentClose = handleParentClose.bind(this);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.open !== prevState.open) {
      return { open: nextProps.open };
    }

    return null;
  }

  handleInputChange = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleDialogClose = () => {
    this.handleParentClose(!this.state.open);
  };

  handleAddNodeSubmit = (e) => {
    e.preventDefault();
    const clearFormValues = () => {
      this.setState({ submitError: false, serial: '', location: '', name: '', helperText: '' });
    };

    if (this.state.loading === true) {
      return;
    }

    this.setState({ loading: true });

    const { serial, location, name } = this.state;

    if (serial === '') {
      return this.setState({ submitError: true, helperText: 'Serial cannot be empty', loading: false });
    }

    return ApiClient.post('/nodes', { serial, location, name })
      .then((resp) => {
        clearFormValues();
        this.setState({ loading: false });
        this.handleDialogClose();
        this.handleParentRefresh();
        this.props.enqueueSnackbar(`Successfully added edge node ${serial}.`, { variant: 'success' });
      })
      .catch((err) => {
        if (err && err.hasOwnProperty('response') && err.response.data) {
          this.setState({ loading: false, submitError: true, helperText: err.response.data });
          this.props.enqueueSnackbar(`${err.response.data}.`, { variant: 'error' });
          return;
        }

        this.setState({ loading: false, submitError: true, helperText: err.toString() });
        this.props.enqueueSnackbar(`${err.toString()}`, { variant: 'error' });
      });
  };

  render() {
    const { classes } = this.props;
    const circularLoader = () => (
      <div className={classes.circularLoaderContainer}>
        <CircularLoader />
      </div>
    );

    const dialogActions = () => (
      <DialogActions>
        <Button onClick={this.handleDialogClose} color="primary">
          Cancel
        </Button>
        <Button onClick={this.handleAddNodeSubmit} type="submit" variant="contained" color="primary">
          Add Edge Node
        </Button>
      </DialogActions>
    );

    return (
      <React.Fragment>
        <Dialog
          open={this.state.open}
          onClose={this.handleDialogClose}
          aria-labelledby="add-node-dialog-title"
          aria-describedby="add-node-dialog-description"
        >
          <DialogTitle id="add-node-dialog-title">Adding an Edge Node</DialogTitle>
          <DialogContent>
            <DialogContentText id="add-node-dialog-description">
            </DialogContentText>
            <form onSubmit={this.handleAddNodeSubmit}>
              <TextField
                autoFocus
                margin="dense"
                onChange={this.handleInputChange}
                id="serial"
                name="serial"
                label="Serial"
                type="text"
                fullWidth
                required
              />
              <TextField
                autoFocus
                margin="dense"
                onChange={this.handleInputChange}
                id="name"
                name="name"
                label="Name"
                type="text"
                fullWidth
              />
              <TextField
                autoFocus
                onChange={this.handleInputChange}
                margin="dense"
                id="location"
                name="location"
                label="Location"
                type="text"
                fullWidth
              />

              {this.state.helperText !== "" ?
                <FormHelperText id="component-error-text">
                  {this.state.helperText}
                </FormHelperText> : null
              }
            </form>
          </DialogContent>
          {dialogActions()}
          {(this.state.loading) ? circularLoader() : null}
        </Dialog>
      </React.Fragment>
    )
  }
}

export default withStyles(styles)(withSnackbar(AddNodeFormDialog));
