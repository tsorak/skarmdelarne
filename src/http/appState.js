const helpers = {
  /** @returns {number} */
  totalRequests: function () {
    return this.data.totalRequests;
  },
};

const appState = {
  data: {
    totalRequests: 0,
  },
  ...helpers,
};

export default appState;
