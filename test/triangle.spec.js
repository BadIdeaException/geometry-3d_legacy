import Triangle from '../src/triangle.js';
import Segment from '../src/segment.js';
import Vector from '../src/vector.js';
import Polygon from '../src/polygon.js';

describe('Triangle', function() {
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

			tri2 = new Triangle(...tri1.map(v => v.add(tri1.normal)));
			expect(tri1.intersect(tri2), 'shifted along normal').to.be.null;

			tri2 = new Triangle(...tri1.map(v => v.add(tri1[1].subtract(tri1[0]).scale(2))));
			expect(tri1.intersect(tri2), 'shifted on plane').to.be.null;

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
			let V = tri1.map(v => v.add(tri1.normal));

			// Now set V[0] to each one of tri1's vertices in turn
			// The triangles should now intersect in V[0]
			for (let i = 0; i < 3; i++) {
				V[0] = tri1[i];
				let tri2 = new Triangle(...V);
				let isect = tri1.intersect(tri2);
				expect(isect).to.be.ok;
				expect(isect).to.be.an.instanceof(Vector);
				expect(isect.equals(V[0])).to.be.true;
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