import kahan from './util/kahan.js';
let url = new URL(import.meta.url);
if (!url.searchParams.has('epsilon')) throw new Error(`Cannot import this module without giving an epsilon ${url.searchParams.toString()}`);
const EPSILON = Number(url.searchParams.get('epsilon'));

/**
 * Represents a three-dimensional vector with `x`, `y`, and `z` coordinates.
 */
class Vector {
	/**
	 * The zero vector, i.e. the vector with x = y = z = 0.
	 * @static
	 * @type {Vector}
	 */	
	static ZERO = new Vector(0,0,0);

	x;
	y;
	z;

	/**
	 * Creates a new vector.
	 * @param  {Number} x The x-coordinate of the vector.
	 * @param  {Number} y The y-coordinate of the vector.
	 * @param  {Number} z The z-coordinate of the vector.
	 */
	constructor(x,y,z) {
		// If x is an object, read the coordinates from that object
		if (typeof x === 'object') {
			y = x.y;
			z = x.z;
			x = x.x;
		}

		this.x = x;
		this.y = y;
		this.z = z;
	}

	get length() {
		return Math.sqrt(this.x**2 + this.y**2 + this.z**2);
	}

	add(v) {
		return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
	}

	subtract(v) {
		return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
	}

	scale(factor) {
		return new Vector(factor * this.x, factor * this.y, factor * this.z);
	}

	unit() {
		return this.scale(1 / this.length);
	}

	equals(v) {
		return Math.abs(this.x - v.x) < EPSILON
			&& Math.abs(this.y - v.y) < EPSILON 
			&& Math.abs(this.z - v.z) < EPSILON;
	}
	
	toString(precision = 5) {		
		return `(${this.x.toFixed(precision)}, ${this.y.toFixed(precision)}, ${this.z.toFixed(precision)})`;
	}

	static cross(v1, v2) {
		return new Vector(
			v1.y * v2.z - v1.z * v2.y,
			- v1.x * v2.z + v1.z * v2.x,
			v1.x * v2.y - v1.y * v2.x
		);
	}

	static dot(v1, v2) {
		// This can suffer from catastrophic cancellation
		// Could be reimplemented according to this: https://en.wikipedia.org/wiki/Kahan_summation_algorithm
		return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
	}

	static angle(v1, v2) {
		return Math.acos(Vector.dot(v1, v2) / (v1.length * v2.length));
	}
}
export default Vector;