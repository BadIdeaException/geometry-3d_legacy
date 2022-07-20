import Vector from '../src/vector.js';
import Polygon from '../src/polygon.js';

describe('Polygon', function() {
	describe('constructor', function() {
		const vertices = [
			new Vector(1, 1, 1),
			new Vector(5, 5, 1),
			new Vector(4, 8, 1),
			new Vector(0, 5, 1),
			new Vector(1, 3, 1)
		];
		
		it('should construct a polygon from points', function() {
			expect(new Polygon(...vertices)).to.deep.equal(vertices);
		});
		it('should construct a polygon from an array of points', function() {
			expect(new Polygon(vertices)).to.deep.equal(vertices);
		});
	})

	describe('.isPlanar', function() {
		it('should return true iff all the polygon\'s points lie in the same plane', function() {
			let polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(5, 5, 1),
				new Vector(4, 8, 1),
				new Vector(0, 5, 1),
				new Vector(1, 3, 1)
			);
			expect(polygon.isPlanar()).to.be.true;

			polygon[1].z = 0;
			expect(polygon.isPlanar()).to.be.false;
		});
	});

	describe('.equals', function() {
		let polygon;
		beforeEach(function() {
			polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(5, 5, 1),
				new Vector(4, 8, 1),
				new Vector(0, 5, 1),
				new Vector(1, 3, 1)
			);
		});

		it('should equal itself', function() {
			expect(polygon.equals(polygon)).to.be.true;	
		});

		it('should equal another polygon with the same vertices, regardless of start point', function() {
			let other = new Polygon(...polygon);
			expect(polygon.equals(other));

			const idx = 3;
			other = new Polygon(...other.slice(idx).concat(other.slice(0, idx)));
			expect(polygon.equals(other)).to.be.true;
		});

		it('should not equal another polygon with different vertices', function() {
			// Construct a polygon from the points, leaving out the second vertex
			let other = new Polygon(...polygon.filter((v, i) => i !== 1));
			expect(polygon.equals(other)).to.be.false;
		});
	});

	describe('.isConvex', function() {
		let polygon;
		beforeEach(function() {
			polygon = new Polygon(
				new Vector(1, 1, 1),
				new Vector(5, 5, 1),
				new Vector(4, 8, 1),
				new Vector(0, 6, 1),
				new Vector(-1, 3, 1)
			);
		});

		it('should return true for convex polygons, false for concave ones', function() {
			expect(polygon.isConvex()).to.be.true;
			polygon[4].x = 2;
			expect(polygon.isConvex()).to.be.false;
		})
	});
});