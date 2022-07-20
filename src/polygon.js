import Vector from './vector.js';
import Constants from './constants.js';

export default class Polygon extends Array {
	constructor() {
		let vertices = (arguments.length === 1 && Array.isArray(arguments[0])) ? arguments[0] : arguments;
		super(vertices.length);
		Object.assign(this, vertices);
	}

	equals(other) {
		if (other.length === 0) 
			return this.length === 0;

		let idx = this.findIndex(v => v.equals(other[0]));
		if (idx === -1) 
			return false;

		let vertices = this.slice(idx).concat(this.slice(0, idx));
		return vertices.length === other.length && vertices.every((v, i) => v.equals(other[i]));
	}

	/**
	 * Returns whether this polygon is planar. 
	 * @return {Boolean} `true` iff this polygon is planar.
	 */
	isPlanar() {
		// A point/line segment/triangle is always planar
		if (this.length <= 3) return true;

		// If we have more than three vertices, calculate the normal of the plane defined by them
		let N = Vector.cross(this[1].subtract(this[0]), this[2].subtract(this[0]));
		// Calculate the plane's distance from the origin
		let d = Vector.dot(N, this[0]);

		// Check that all remaining vertices also lie on the plane
		for (let i = 3; i < this.length; i++) {
			if (Math.abs(Vector.dot(N, this[i]) - d) > Constants.EPSILON) return false;
		}

		return true;
	}

	/**
	 * Returns whether this polygon is convex, i.e. whether all of its internal 
	 * angles are smaller than 180 degrees. 
	 * 
	 * The polygon must be planar, although this is not checked by this method!
	 * @return {Boolean} `true` iff this polygon is convex.
	 */
	isConvex() {
		/*
			A polygon is convex if every edge is a dividing edge, i.e. if for every edge,
			all other vertices are on the same side of the edge.
		 */

		for (let i = 0; i < this.length; i++) {
			let a = this[i];
			let b = this[(i + 1) % this.length];

			// The normal of this polygon
			let normal = Vector.cross(this[1].subtract(this[0]), this[2].subtract(this[0]));
			// The normal of the plane spanned by the polygon's normal and the edge AB
			let N = Vector.cross(normal, b.subtract(a));
			let d = Vector.dot(N, a);
			
			let side;
			for (let j = 0; j < this.length; j++) {
				if (j === i || j === i + 1) continue;

				let dist = Vector.dot(N, this[j]) - d;
				if (Math.abs(dist) < Constants.EPSILON) dist = 0;
				
				side ||= Math.sign(dist); // Don't want ??= here, because if by any chance the first point is collinear with AB, we'd be requiring all other points to be as well
				if (Math.sign(dist) !== side) return false;
			}
		}
		return true;
	}

	/**
	 * Tesselates this polygon into triangles.
	 * @return {Triangle[]} A list of triangles that the polygon was split into.
	 */
	tesselate() {

	}
}