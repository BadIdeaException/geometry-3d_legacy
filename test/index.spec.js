describe('index.js', function() {
	it('should respect the EPSILON parameter when importing', async function() {
		const EPSILON = 1.0e-2;
		let m = await import(`../src/index.js?epsilon=${EPSILON}`);
		const actual = m.EPSILON;
		expect(actual).to.equal(EPSILON);
	});

	it('should default EPSILON to 1.0-8 when not specified differently', async function() {
		const EPSILON = 1.0e-8;
		let m = await import('../src/index.js');
		const actual = m.EPSILON;
		expect(actual).to.equal(EPSILON);
	});
});