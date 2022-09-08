const VectorType = Symbol();

export default EPSILON => class Vector {
	static ZERO = new Vector(0,0,0);

	static [VectorType];
	static [Symbol.hasInstance](instance) {
		return VectorType in Object.getPrototypeOf(instance).constructor;
	}

	x;
	y;
	z;

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