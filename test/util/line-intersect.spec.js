import Vector from '../../src/vector.js';
import lineIntersect from '../../src/util/line-intersect.js';

describe('lineIntersect', function() {
	let a1,b1;

	beforeEach(function() {
		a1 = new Vector(1, 1, 1);
		b1 = new Vector(2, 2, 2);
	});

	it('should return null if the lines are skew', function() {
		let a2 = new Vector(2, 1, 1);
		let b2 = new Vector(4, 3, 2);

		expect(lineIntersect(a1, b1, a2, b2)).to.be.null;
	});

	it('should return null if the lines are parallel but not collinear', function() {
		let a2 = new Vector(2, 1, 1);
		let b2 = new Vector(3, 2, 2);

		expect(lineIntersect(a1, b1, a2, b2)).to.be.null;
	});

	it('should return {a,b} if the lines are parallel and collinear', function() {
		let a2 = new Vector(3, 3, 3);
		let b2 = new Vector(4, 4, 4);

		expect(lineIntersect(a1, b1, a2, b2)).to.deep.equal({ a: a1, b: b1 });
	});

	it('should return the intersection point if the lines intersect', function() {
		let a2 = new Vector(1, 1, 1);
		let b2 = new Vector(3, 4, 5);

		expect(lineIntersect(a1, b1, a2, b2)).to.deep.equal(a1);
	});
});

