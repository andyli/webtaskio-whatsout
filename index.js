const Verquire = require('verquire');
const _ = require('lodash@4.8.2');
const rp = require('request-promise');
const Promise = require('bluebird');
const semver = require('semver');

const abcsort = function (a, b) {
	if (a.name < b.name) {
		return -1;
	}

	if (a.name > b.name) {
		return 1;
	}

	return 0;
};

const requests = [];
const modules = _.map(Verquire.modules, (versions, module_name) => {
	// sort versions in desc order
	versions.sort(semver.rcompare);

	// info object to be returned
	var module_info = {
		name: module_name,
		available_versions: versions,
		latest_version: null // will be replaced if fetching the registry is successful
	};
	requests.push(
		rp('http://registry.npmjs.org/' + module_name + '/latest')
			.then(str => {
				module_info.latest_version = JSON.parse(str).version;
			})
			.catch(() => {}) // ignore error since some module may not exist in the registry
	);
	return module_info;
}).sort(abcsort);

module.exports = cb => {
	Promise.all(requests)
		.then(() => {
			const outdated = modules.filter(m => {
				return m.latest_version != null && semver.gt(m.latest_version, m.available_versions[0])
			});
			cb(null, {
				total_modules: modules.length,
				total_outdated: outdated.length,
				outdated: outdated
			});
		});
};