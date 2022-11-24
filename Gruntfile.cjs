module.exports = function(grunt) {	
	grunt.initConfig({
		eslint: {
			target: ['src/**/*.js', 'test/**/*.js']
		},
		jsdoc2md: {
			dist: {
				src: 'src/vector.js',
				dest: 'docs/vector.md'
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-jsdoc-to-markdown');	
}