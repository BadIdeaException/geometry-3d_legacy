module.exports = function(grunt) {	
	grunt.initConfig({
		eslint: {
			target: ['src/**/*.js', 'test/**/*.js']
		}
	});
	
	grunt.loadNpmTasks('grunt-eslint');
}