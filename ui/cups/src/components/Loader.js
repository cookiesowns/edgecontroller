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

import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Grid, CircularProgress } from '@material-ui/core';

const styles = theme => ({
  item: {
    paddingTop: "10%",
  },
});

const Loader = ({ classes }) =>
  <Grid container direction="column" justify="center" alignItems="center">
    <Grid item className={classes.item}>
      <CircularProgress mode="indeterminate" />
    </Grid>
  </Grid>


export default withStyles(styles)(Loader);
