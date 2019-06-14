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