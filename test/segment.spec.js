import SegmentFactory from '../src/segment.js';
import VectorFactory from '../src/vector.js';

const EPSILON = 1.0e-8;
const Vector = VectorFactory(EPSILON);
const Segment = SegmentFactory(EPSILON);

describe('Segment', function() {	
	describe('.collinear', function() {
		let g;
		beforeEach(function() {
			g = new Segment(new Vector(1,1,1), new Vector(2,2,2));
		});

		it('should be collinear to itself', function() {
			expect(g.collinear(g)).to.deep.equal({ t1: 0, t2: 1 	});			
		});

		it('returns true iff both segments are on the same line', function() {
			let h;

			h = new Segment(
				new Vector(3,3,3), new Vector(4,4,4)
			);

			expect(g.collinear(h), 'g is collinear to h=[ (3,3,3), (4,4,4) ]').to.deep.equal({ t1: 2, t2: 3 });
			expect(h.collinear(g), 'h=[ (3,3,3), (4,4,4) ] is collinear to g').to.deep.equal({ t1: -2, t2: -1 });

			h.a.x += EPSILON;
			expect(g.collinear(h), 'g is collinear to h within EPSILON bounds').to.be.ok;

			h = new Segment(
				new Vector(3,3,3), new Vector(3,4,5)
			);
			expect(g.collinear(h), 'g is not collinear to h=[ (3,3,3), (3,4,5) ]').to.be.null;
			expect(h.collinear(g), 'h=[ (3,3,3), (3,4,5) ] is not collinear to g').to.be.null;
		});
	});

	describe('.intersect', function() {
		let g;
		beforeEach(function() {
			g = new Segment(new Vector(1,1,1), new Vector(5,5,5));
		});

		it('should intersect itself', function() {
			expect(g.intersect(g)).to.deep.equal(g);
		});

		it('should return null if the segments do not intersect', function() {
			let h = new Segment(new Vector(-1,-1,-1), new Vector(-5,-5,-5));
			expect(g.intersect(h)).to.be.null;
			expect(h.intersect(g)).to.be.null;

			h = new Segment(new Vector(7,7,7), new Vector(8,8,8));
			expect(g.intersect(h), 'collinear but not overlapping').to.be.null;
			expect(h.intersect(g), 'collinear but not overlapping').to.be.null;
		});

		it('should return the intersection point if the segments intersect in a point', function() {
			let h = new Segment(new Vector(1,3,3), new Vector(5,3,3));

			let isect = g.intersect(h);
			expect(isect).to.be.ok;
			expect(isect).to.be.an.instanceof(Vector);
			expect(isect).to.deep.equal({ x: 3, y: 3, z: 3 });
			
			isect = h.intersect(g);
			expect(isect).to.be.ok;
			expect(isect).to.be.an.instanceof(Vector);
			expect(isect).to.deep.equal({ x: 3, y: 3, z: 3 });
		});

		it('should return the intersection segment if the segments are collinear and overlapping', function() {
			let h = new Segment(new Vector(3,3,3), new Vector(8,8,8));
			let expected = new Segment(new Vector(3,3,3), new Vector(5,5,5));

			let isect = g.intersect(h);
			expect(isect).to.be.ok;
			expect(isect).to.be.an.instanceof(Segment);
			expect(isect).to.deep.equal(expected);
		});
	});
});