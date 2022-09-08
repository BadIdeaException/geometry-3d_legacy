import TriangleFactory from '../src/triangle.js';
import SegmentFactory from '../src/segment.js';
import VectorFactory from '../src/vector.js';
import PolygonFactory from '../src/polygon.js';

const EPSILON = 1.0e-8;
const Vector = VectorFactory(EPSILON);
const Segment = SegmentFactory(EPSILON);
const Polygon = PolygonFactory(EPSILON);
const Triangle = TriangleFactory(EPSILON);

describe('Triangle', function() {
	it('should be a Triangle, and a Polygon', function() {
		const tri = new Triangle(
			new Vector(1,0,0),
			new Vector(5,5,5),
			new Vector(-2,4,4)
		);
		expect(tri).to.be.an.instanceof(Triangle);
		expect(tri).to.be.an.instanceof(Polygon);
	});

	it('should have the same normal orientation as a Triangle as as a Polygon', function() {
		const vertices = [
			new Vector(1,0,0),
			new Vector(5,5,5),
			new Vector(-2,4,4)
		];
		expect(new Triangle(vertices).normal.unit()).to.deep.equal(new Polygon(vertices).normal.unit());
	});
	
	describe('.contains', function() {
		let tri;
		let u;
		let v;

		beforeEach(function() {
			tri = new Triangle(
				new Vector(1,0,0),
				new Vector(5,5,5),
				new Vector(-2,4,4)
			);
			u = tri[1].subtract(tri[0]);
			v = tri[2].subtract(tri[0]);
		});

		it('should return true for points inside the triangle', function() {
			let p = tri[0].add(u.scale(0.2)).add(v.scale(0.4));
			expect(tri.contains(p)).to.be.true;			
		});

		it('should return true for points on the edges of the triangle', function() {
			let p = tri[0].add(u.scale(0.5));
			expect(tri.contains(p)).to.be.true;

			p = tri[0].add(v.scale(0.5));
			expect(tri.contains(p)).to.be.true;

			p = tri[0].add(u.scale(0.5)).add(v.scale(0.5));
			expect(tri.contains(p)).to.be.true;
		});

		it('should return true for the vertices of the triangle', function() {
			for (let i = 0; i < 3; i++)
				expect(tri.contains(tri[i])).to.be.true;
		});

		it('should return false for points outside the triangle', function() {
			let p = tri[0].add(u).add(u).add(v); // This point is in the plane of the triangle, but outside its boundaries			
			expect(tri.contains(p), 'in plane but outside boundaries').to.be.false;

			p = tri[0].add(u.scale(0.25)).add(v.scale(0.25)).add(tri.normal); // This point is "above"/"below" the triangle
			expect(tri.contains(p), '"above"/"below"').to.be.false;

			p = tri[0].add(u).add(v).add(tri.normal);
			expect(tri.contains(p), 'completely unrelated').to.be.false;
		});
	});

	describe('.cut', function() {
		let tri;
		beforeEach(function() {
			tri = new Triangle(
				new Vector(1,0,0),
				new Vector(5,5,5),
				new Vector(-2,4,4)
			);
		});

		it('should not cut the triangle if it does not intersect the cut plane', function() {
			['x', 'y', 'z'].forEach(function(dim) {
				expect(tri.cut(dim, -10)).to.be.an('object').with.property('above').that.deep.equals(tri);
				expect(tri.cut(dim, +10)).to.be.an('object').with.property('below').that.deep.equals(tri);
			});
		});

		it('should have the triangle in both above and below if it is co-planar with the cut plane', function() {
			const dim = 'z';
			const offset = 1;
			let vertices = tri.map(v => new Vector({ ...v, [dim]: offset }));
			tri = new Triangle(...vertices);

			let cut = tri.cut(dim, offset);
			expect(cut).to.be.an('object').with.all.keys('above', 'below');
			expect(cut.above).to.deep.equal(tri);
			expect(cut.below).to.deep.equal(tri);
		});

		it('should cut the triangle into two triangles if one of its vertices is on the cut plane and the other two are on opposite sides', function() {
			const offset = 1;
			let cut = tri.cut('x', offset);
			expect(cut).to.be.an('object').with.all.keys('above', 'below');
			expect(cut.above).to.be.an.instanceof(Triangle);
			expect(cut.below).to.be.an.instanceof(Triangle);
			// Above should contain the vertex that is on the cut plane
			expect(cut.above).to.contain(tri[0]);
			// Above should contain the vertex that is on the positive side of the cut plane
			expect(cut.above).to.contain(tri[1]);
			// The remaining vertex should be on the cut plane as well
			expect(cut.above).to.satisfy(tri => tri.some(vertex => 
				vertex !== tri[0] 
				&& vertex !== tri[1] 
				&& vertex.x === offset));
			// Below should contain the vertex that is on the cut plane
			expect(cut.below).to.contain(tri[0]);
			// Below should contain the vertex that is on the negative side of the cut plane
			expect(cut.below).to.contain(tri[2]);
			// The remaining vertex should be on the cut plane as well
			expect(cut.below).to.satisfy(tri => tri.some(vertex => 
				vertex !== tri[0]
				&& vertex !== tri[2]
				&& vertex.x === offset));
		});

		it('should cut the triangle into above and below parts if it intersects the cut plane', function() {			
			const offset = 2;
			['x', 'y', 'z'].forEach(function(dim) {
				let cut = tri.cut(dim, offset);
				// How many of tri's vertices should be in above?
				// If this is 1, above should be a triangle
				// If it is 2, above should be a polygon that is not a triangle
				let len = tri.map(v => v[dim]).filter(coord => coord > offset).length;

				expect(cut).to.be.an('object').with.all.keys('above', 'below');
				if (len === 2)
					expect(cut.above).to.be.an.instanceof(Polygon).and.not.an.instanceof(Triangle);
				else
					expect(cut.above).to.be.an.instanceof(Triangle);
				// Above should include all of tri's vertices that have a dim coordinate greater than the cut plane offset
				expect(cut.above).to.include.all.members(tri.filter(v => v[dim] > offset));
				// All points that are not vertices of tri should be on the cut plane
				expect(cut.above).to.satisfy(polygon => polygon
							.filter(v => !tri.includes(v))
							.every(v => v[dim] === offset));

				if (len === 1)
					expect(cut.below).to.be.an.instanceof(Polygon).and.not.an.instanceof(Triangle);
				else
					expect(cut.below).to.be.an.instanceof(Triangle);
				expect(cut.below).to.include.all.members(tri.filter(v => v[dim] < offset));
				expect(cut.below).to.satisfy(polygon => polygon
							.filter(v => !tri.includes(v))
							.every(v => v[dim] === offset));							
			});
		});
	});

	describe('.intersect', function() {
		let tri1;
		beforeEach(function() {
			tri1 = new Triangle(
				new Vector(1,0,0),
				new Vector(5,5,5),
				new Vector(-2,4,4)
			);
		});

		it('should return null if the triangles do not intersect', function() {
			let tri2;

			// tri2 is 'above' tri1
			tri2 = new Triangle(...tri1.map(v => v.add(tri1.normal)));
			expect(tri1.intersect(tri2), 'shifted along normal').to.be.null;

			// tri2 is co-planar to tri1, but does not intersect it
			tri2 = new Triangle(...tri1.map(v => v.add(tri1[1].subtract(tri1[0]).scale(2))));
			expect(tri1.intersect(tri2), 'shifted on plane').to.be.null;

			// tri2 is skew to tri1 and does not intersect it
			tri2 = new Triangle(
				new Vector(10,10,10),
				new Vector(15,15,20),
				new Vector(15,0,0)
			);
			expect(tri1.intersect(tri2), 'completely unrelated').to.be.null;
		});

		it('should return the triangle when intersected with itself', function() {
			let isect = tri1.intersect(tri1)
			expect(isect).to.be.ok;
			expect(isect).to.be.an.instanceof(Triangle);
			expect(isect.equals(tri1)).to.be.true;
		});

		it('should return the point if the triangles touch in one point only, and this point should be one of the six corners', function() {
			// Vertex set of tri1, shifted along it's normal
			let vertices = tri1.map(v => v.add(tri1.normal));

			// Now set vertices[0] to each one of tri1's vertices in turn
			// The triangles should now intersect in vertices[0]
			for (let i = 0; i < 3; i++) {
				vertices[0] = tri1[i];
				let tri2 = new Triangle(...vertices);
				let isect = tri1.intersect(tri2);
				expect(isect).to.be.ok;
				expect(isect).to.be.an.instanceof(Vector);
				expect(isect.equals(vertices[0])).to.be.true;
			}
		});

		it('should return a line segment if the triangles touch in a line only, and this segment should be one of the six edges', function() {
			let tri2;
			for (let i = 0; i < 3; i++) {
				// Construct a triangle that shares two vertices with tri1, with the third vertex
				// being different
				tri2 = new Triangle(tri1[i], tri1[(i + 1) % 3], tri1[(i + 2) % 3].add(tri1.normal));
				let isect = tri1.intersect(tri2);
				expect(isect).to.be.ok;
				expect(isect).to.be.an.instanceof(Segment);
				expect(isect.equals(tri1.edges[i])).to.be.true;
			}
		});

		it('should return a polygon if the triangles are co-planar and overlapping', function() {
			tri1 = new Triangle(
				new Vector(1,1,1),
				new Vector(5,1,1),
				new Vector(2,4,1)
			);
			let tri2;

			// Tri2 cuts off a corner of Tri1
			tri2 = new Triangle(
				new Vector(1,2,1),
				new Vector(5,4,1),
				new Vector(1,5,1)
			);
			let expected = new Triangle(
				new Vector(3,3,1),
				new Vector(2,4,1),
				new Vector(1.4, 2.2, 1)
			);

			let isect = tri1.intersect(tri2);
			expect(isect, 'cut corner').to.be.ok;
			expect(isect, 'cut corner').to.be.an.instanceof(Triangle);
			expect(isect.equals(expected), 'cut corner').to.be.true;

			// Tri2 cuts into one of the sides of Tri1
			tri2 = new Triangle(
				new Vector(2, 2.8, 1),
				new Vector(6, 2.8, 1),
				new Vector(3.6, 6, 1)
			);
			expected = new Triangle(
				new Vector(2, 2.8, 1),
				new Vector(3.2, 2.8, 1),
				new Vector(2.4, 3.6, 1)
			);

			isect = tri1.intersect(tri2);
			expect(isect, 'cut one side').to.be.ok;
			expect(isect, 'cut one side').to.be.an.instanceof(Triangle);
			expect(isect.equals(expected), 'cut one side').to.be.true;

			// Tri2 cuts across two sides of Tri1
			tri2 = new Triangle(
				new Vector(1, 2, 1),
				new Vector(5, 2, 1),
				new Vector(3, 4, 1)
			);
			expected = new Polygon(
				new Vector(4/3, 2, 1),
				new Vector(4, 2, 1),
				new Vector(2.5, 3.5, 1),
				new Vector(1.5, 2.5, 1)
			);

			isect = tri1.intersect(tri2);
			expect(isect, 'cut two sides').to.be.ok;
			expect(isect, 'cut two sides').to.be.an.instanceof(Polygon);
			expect(isect, 'cut two sides').to.not.be.an.instanceof(Triangle);
			expect(isect.equals(expected), 'cut two sides').to.be.true;

			// Star of David
			tri2 = new Triangle(
				new Vector(3.5, 0.5, 1),
				new Vector(6, 3, 1),
				new Vector(1, 3, 1)
			);
			expected = new Polygon(
				new Vector(4, 1, 1),
				new Vector(4.5, 1.5, 1),
				new Vector(3, 3, 1),
				new Vector(5/3, 3, 1),
				new Vector(1.5, 2.5, 1),
				new Vector(3, 1, 1)
			);

			isect = tri1.intersect(tri2);
			expect(isect, 'cut three sides').to.be.ok;
			expect(isect, 'cut three sides').to.be.an.instanceof(Polygon);
			expect(isect, 'cut three sides').to.not.be.an.instanceof(Triangle);
			expect(isect.equals(expected), 'cut three sides').to.be.true;
		});

		it('should return a line segment if the triangles jut through each other', function() {
			let tri2 = new Triangle(
				new Vector(4.5, -2, 4),
				new Vector(-2.5, 6, 0),
				new Vector(-0.5, 10, 4)
			);
			let expected = new Segment(
				new Vector(1, 2, 2),
				new Vector(2, 4, 4)
			);
			let isect = tri1.intersect(tri2);
			expect(isect).to.be.ok;
			expect(isect).to.be.an.instanceof(Segment);
			expect(isect.equals(expected)).to.be.true;
		}); 
		
		it('should return the contained triangle if the triangles are coplanar and one is completely inside the other', function() {
			tri1 = new Triangle(
				new Vector(1,1,0),
				new Vector(5,1,0),
				new Vector(3,4,0)
			);
			let tri2 = new Triangle(
				new Vector(2,2,0),
				new Vector(4,2,0),
				new Vector(3,3,0)
			);
			let isect = tri1.intersect(tri2);
			expect(isect).to.be.ok;
			expect(isect).to.be.an.instanceof(Triangle);
			expect(isect.equals(tri2)).to.be.true;
		});
	});
});