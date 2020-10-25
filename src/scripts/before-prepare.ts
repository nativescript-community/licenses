
module.exports = function ($logger, projectData, injector, hookArgs) {
    const prepareData = hookArgs.prepareData;
    prepareData.env = prepareData.env || {};
    prepareData.env.externals = prepareData.env.externals || [];
    prepareData.env.externals.push('~/licenses.json');
    prepareData.env.externals.push('licenses.json');
};
