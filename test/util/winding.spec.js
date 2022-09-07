import winding from '../../src/util/winding.js';

describe('winding', function() {
	it('should return -1 for counter-clockwise and +1 for clockwise ordering', function() {
		let vertices = [
			{ x: 0, y: 0 },
			{ x: 4, y: 0 },
			{ x: 6, y: 2 },
			{ x: 2, y: 3 },
			{ x: -2, y: 1 }
		];
		expect(winding(vertices)).to.equal(-1);
		expect(winding(vertices.reverse())).to.equal(+1);
	});

	it('should return 0 for collinear vertices', function() {
		let vertices = [ 1, 2, 3, 2 ].map(x => ({ x, y: 1 }));
		expect(winding(vertices)).to.equal(0);
	});
	
	it('should return undefined if there are less than three vertices', function() {
		let vertices = [
			{ x: 0, y: 0 },
			{ x: 4, y: 0 },
			{ x: 2, y: 2 },
		];
		for (let i = 0; i <= 2; i++)
			expect(winding(vertices.slice(0, i))).to.be.undefined;

		expect(winding(vertices)).to.exist;
	});
})