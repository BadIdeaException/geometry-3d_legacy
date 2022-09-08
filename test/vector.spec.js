import VectorFactory from '../src/vector.js';

const EPSILON = 1.0e-8;
const Vector = VectorFactory(EPSILON);

describe('Vector', function() {
	it('should recognize other vectors as instances', function() {
		const Vector2 = VectorFactory(EPSILON);
		expect(new Vector2(1, 2, 3)).to.be.an.instanceof(Vector);
	});

	describe('.equals', function() {
		it('returns true for vectors within a box of 2 * EPSILON edge length, false otherwise', function() {
			const v = new Vector(1,1,1);
			let w;

			expect(v.equals(v), 'v equals itself').to.be.true;
			
			for (let dim of ['x','y','z']) {
				w = new Vector(v.x, v.y, v.z);
				w[dim] += 0.5 * EPSILON;
				expect(v.equals(w), `w.${dim} is moved by 1/2 EPSILON`).to.be.true;
				expect(w.equals(v), `w.${dim} is moved by 1/2 EPSILON`).to.be.true;
			}

			for (let dim of ['x','y','z']) {
				w = new Vector(v.x, v.y, v.z);
				w[dim] += 2 * EPSILON;
				expect(v.equals(w), `w.${dim} is moved by 2 EPSILON`).to.be.false;
				expect(w.equals(v), `w.${dim} is moved by 2 EPSILON`).to.be.false;
			}

		});
	});
});