import Vector from '../src/vector.js';
import Constants from '../src/constants.js';

const EPSILON = Constants.EPSILON;

describe('Vector', function() {
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