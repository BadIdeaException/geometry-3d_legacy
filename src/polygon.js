import Vector from './vector.js';
import Constants from './constants.js';

export default class Polygon extends Array {
	constructor() {
		super();
		Object.assign(this, arguments);
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
		if (vertices.length <= 3) return true;

		// If we have more than three vertices, calculate the normal of the plane defined by them
		let N = Vector.cross(vertices[1].subtract(vertices[0]), vertices[2].subtract(vertices[0]));
		// Calculate the plane's distance from the origin
		let d = -Vector.dot(N, vertices[0]);

		// Check that all remaining vertices also lie on the plane
		for (let i = 3; i < vertices.length; i++) {
			if (Vector.dot(N, vertices[i]) + d > Constants.EPSILON) return false;
		}

		return true;
	}

	/**
	 * Returns whether this polygon is convex, i.e. whether all of its internal 
	 * angles are smaller than 180 degrees.
	 * @return {Boolean} `true` iff this polygon is convex.
	 */
	isConvex() {

	}

	/**
	 * Tesselates this polygon into triangles.
	 * @return {Triangle[]} A list of triangles that the polygon was split into.
	 */
	tesselate() {

	}
}