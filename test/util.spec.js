import { lineIntersect, clipPolygon } from '../src/util.js';
import Vector from '../src/vector.js';

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

describe('clipPolygon', function() {
	let subject;

	beforeEach(function() {
		subject = [
			new Vector(1, 1, 1),
			new Vector(3, 1, 1),
			new Vector(2, 5, 1),
			new Vector(-3, 5, 1),
			new Vector(0, 1, 1)
		];
	});

	it('should return the subject if clipped with itself', function() {
		expect(clipPolygon(subject, subject)).to.deep.equal(subject);
	});

	it('should return an empty polygon if there is no intersection', function() {
		let clip = subject.map(v => new Vector(v.x + 10, v.y, v.z));		
		expect(clipPolygon(subject, clip)).to.be.empty;
	});

	it('should return the intersection of two co-planar overlapping polygons', function() {
		const clip = [
			new Vector(0, 2, 1),
			new Vector(4, 0, 1),
			new Vector(8, 2, 1),
			new Vector(7.5, 5, 1),
		];
		const expected = [
			new Vector(0, 2, 1),
			new Vector(2, 1, 1),
			new Vector(3, 1, 1),
			new Vector(2.5, 3, 1)
		];
		let result = clipPolygon(subject, clip);
		// Post-process result so it matches the order the vertices are given in expected
		let idx = result.findIndex(v => v.equals(expected[0]));
		result = result.slice(idx).concat(result.slice(0, idx));
		expect(result).to.deep.equal(expected);
	});
});