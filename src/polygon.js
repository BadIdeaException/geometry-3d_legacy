import Vector from './vector.js';
import Constants from './constants.js';
import pc from 'polygon-clipping';
import winding from './util/winding.js';
import sign from './util/sign.js';

function oper(poly1, poly2, mode) {
	const eq = (P, Q) => Math.abs(P.x - Q.x) < Constants.EPSILON && Math.abs(P.y - Q.y) < Constants.EPSILON;

	// Make sure poly1 and poly2 are co-planar
	const normal = poly1.normal;

	const axis = [...'xyz'].reduce((prev, curr) => normal[curr] >= normal[prev] ? curr : prev);
	const [ dim1, dim2 ] = [...'xyz'].filter(dim => dim !== axis);
	const d = -Vector.dot(normal, poly1[0]);

	// Check that polygons are co-planar
	// They are co-planar if their normals are parallel, and if an arbitrary point from poly2 is also on the poly1 plane
	if (!normal.equals(poly2.normal.scale(normal[axis] / poly2.normal[axis])) || sign(Vector.dot(normal, poly1[0]) - Vector.dot(normal, poly2[0])) !== 0) {
		throw new Error(`Cannot perform ${mode} on polygons that are not co-planar`);
	}

	let result = pc[mode]([poly1.map(vertex => [ vertex[dim1], vertex[dim2] ])], [poly2.map(vertex => [ vertex[dim1], vertex[dim2] ])]);
	// Transform coordinates back from array form to { x, y } form and remove duplicate last vertex
	result = result.map(poly => poly.map(ring => {
		ring = ring.map(([ x, y ]) => ({ x, y }))
		// If the first and the last vertex are equal, remove the last vertex
		if (eq(ring.at(0), ring.at(-1)))
			ring.pop();
		return ring;
	}));

	// result is now an array of polygons, 
	// with each polygon being an array of linear rings, 
	// with each linear ring being an implicitly-closed sequence of { x, y } vertices

	// For any polygon that has a hole, lift the hole to be its own polygon. This allows for easier
	// processing in the next step, when polygons with holes are broken up into parts.
	for (let i = result.length - 1; i >= 0; i--) {
		const poly = result[i];
		if (poly.length > 2)
			throw new Error(`Expected a polygon with at most one hole, but got ${poly.length - 1} holes`);
		else if (poly.length === 2) {
			result.push(poly.pop());
		}
		// Flatten the polygon from an array of linear rings to an array of vertices
		result[i] = poly[0];
	}
	

	if (result.length > 2 && result.filter(poly => winding(poly) === +1).length > 1)
		throw new Error(`Expected a polygon with at most one hole, but got ${result.length - 1} holes`);


	if (result.length > 1 && winding(result[1]) === +1) {
		const exterior = result[0];
		const hole = result[1];

		/*		
			Unfortunately, our data structure is not designed for polygons with holes.
			So instead, we will bisect the result polygon in such a way that is guaranteed to create
			crossing intersections with the hole.
			
			Specifically, we will calculate the y-coordinate that is halfway between the hole's
			lowest and highest point. (Actually, any value strictly greater than the lowest and strictly less
			that the highest would work.) 

			Our bisection line is a horizontal line with that y-coordinate. This is guaranteed to have at least
			two crossing intersections with the hole. Because the hole is contained in the 
			polygon, it follows that it has at least two crossing intersections with the
			polygon as well.

			We now find the left-most intersection C1 and the right-most intersection C2 between the 
			hole and the bisection line. We then find S1 as the closest intersection to the left of C1 between
			the polygon and the bisection line, and likewise we find S2 as the closest intersection to the right
			of C2. (Note that these are guaranteed to exist since the hole is contained entirely within the
			polygon.)
			
			We now construct the result polygons: One is formed by the edges between S1 and S2 travelling along
			the top portion of the polygon, connecting S2 to C2, travelling along the top portion between C2 and
			C1, and connecting C1 to S1.
			Similarly, the other is formed by travelling along the bottom portion between S2 and S1, connecting
			S1 and C1, travelling along the bottom portion of the hole to C2, and connecting C2 and S2.
		*/
	
		// Find the bisection line
		let y = (Math.min(...hole.map(v => v.y)) + Math.max(...hole.map(v => v.y))) / 2;

		// The left-most and right-most intersections of the hole with the bisection line
		let C1;
		let C2;
		// The indices of the starting points of the edges that C1 and C2 are on
		let indexC1;
		let indexC2;
		for (let i = 0; i < hole.length; i++) {
			let Q1 = hole[i];
			let Q2 = hole[(i + 1) % hole.length];			
			if (Q1.y <= y && Q2.y > y) {
				// The GeoJSON spec guarantees hole to be wound clockwise,
				// so if Q1.y <= y < Q2.y, that is guaruanteed to be a candidate for the left-most intersection C1.
				let alpha = (y - Q1.y) / (Q2.y - Q1.y);
				let x = Q1.x + alpha * (Q2.x - Q1.x);

				if (!C1 || x < C1.x)  {
					C1 = { x, y };
					indexC1 = i;
				}
			} else if (Q1.y >= y && Q2.y < y) {
				// For the same reasons as above, this can only be a candidate for the right-most intersection C2. 
				let alpha = (y - Q1.y) / (Q2.y - Q1.y);
				let x = Q1.x + alpha * (Q2.x - Q1.x);

				if (!C2 || x > C2.x) {
					C2 = { x, y };
					indexC2 = i;
				}
			}
		}
		
		// Find the intersection S1 that is closest to the left of C1, and S2 that is closest to the right of C2.
		
		let S1;
		let S2;
		let indexS1;
		let indexS2;
		for (let i = 0; i < exterior.length; i++) {
			let P1 = exterior[i];
			let P2 = exterior[(i + 1) % exterior.length];
			if (P1.y <= y && P2.y > y) {
				// Because the exterior ring is wound counter-clockwise, this can only be a candidate for the
				// right intersection S2.
				let alpha = (y - P1.y) / (P2.y - P1.y);
				let x = P1.x + alpha * (P2.x - P1.x);
				if (!S2 || Math.abs(x - C2.x) < Math.abs(S2.x - C2.x)) {
					S2 = { x, y };
					indexS2 = i;
				} 
			} else if (P1.y >= y && P2.y < y) {
				// For the same reasons, this can only be a candidate for the left intersection S1.
				let alpha = (y - P1.y) / (P2.y - P1.y);
				let x = P1.x + alpha * (P2.x - P1.x);
				if (!S1 || Math.abs(x - C1.x) < Math.abs(S1.x - C1.x)) {
					S1 = { x, y };
					indexS1 = i;
				}
			}
		}

		// Make sure that S1 comes after S2 on the exterior, and C2 comes after C1 on the hole
		if (indexS1 < indexS2)
			indexS1 += exterior.length;
		if (indexC2 < indexC1)
			indexC2 += hole.length;

		let top = [];
		let bottom = [];

		// Trace the exterior and add points to the correct result polygon.
		// We will start at the edge AFTER S2 and move around the polygon,
		// adding points to the top result polygon until we reach S1, and 
		// to the pottom polygon after.
		for (let i = indexS2 + 1; i < indexS2 + 1 + exterior.length; i++) {
			if (i <= indexS1) 
				top.push(exterior[i % exterior.length]);
			else
				bottom.push(exterior[i % exterior.length]);
		}
		if (!eq(S1, top.at(-1)))
			top.push(S1);
		if (!eq(C1, top.at(-1)))
			top.push(C1);
		if (!eq(S2, bottom.at(-1)))
			bottom.push(S2);
		if (!eq(C2, bottom.at(-1)))
			bottom.push(C2);
		// Trace the hole and add points to the correct result polygon
		for (let i = indexC1 + 1; i < indexC1 + 1 + hole.length; i++) {
			if (i <= indexC2)
				top.push(hole[i % hole.length]);
			else
				bottom.push(hole[i % hole.length]);
		}
		if (!eq(C2, top.at(-1)))
			top.push(C2);
		if (!eq(S2, top.at(-1)))
			top.push(S2);
		if (!eq(C1, bottom.at(-1)))
			bottom.push(C1);
		if (!eq(S1, bottom.at(-1)))
			bottom.push(S1);

		result = [ top, bottom ];
	}

	result = result.map(poly => 
		poly.map(({ x, y }) => new Vector({
			[dim1]: x,
			[dim2]: y,
			[axis]: -(normal[dim1] * x + normal[dim2] * y + d) / normal[axis]
		})
	));

	return result;
}

export default class Polygon extends Array {
	constructor() {
		let vertices = (arguments.length === 1 && Array.isArray(arguments[0])) ? arguments[0] : arguments;
		super(vertices.length);
		Object.assign(this, vertices);
	}

	/** 
	 * The normal of the polygon. If the polygon is not planar, it will return the normal of a "best fit" plane
	 * to the polygon's vertices. If the polygon has less than three vertices, the normal is undefined.
	 */
	get normal() {
		if (this.length < 3) return undefined;

		/*
			This computes the polygon's normal with Newell's method for computing the plane equation.			
			See e.g. http://cs.haifa.ac.il/~gordon/plane.pdf
		 */
		let x = 0;
		let y = 0;
		let z = 0;

		for (let i = 0; i < this.length; i++) {
			let u = this[i];
			let v = this[(i + 1) % this.length];
			x += (u.y - v.y) * (u.z + v.z);
			y += (u.z - v.z) * (u.x + v.x);
			z += (u.x - v.x) * (u.y + v.y);
		}
		return new Vector(x, y, z);
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
	 * Intersects this polygon with another polygon. The two must be co-planar, or an error will be thrown. 
	 * @param  {Polygon} other The polygon to intersect with
	 * @return {Polygon[]}       An array of result polygons.
	 */
	intersect(other) {
		return oper(this, other, 'intersection').map(poly => new Polygon(poly));
	}

	/**
	 * Subtracts another polygon from this polygon. The two must be co-planar, or an error will be thrown. 
	 *
	 * If the result would have a hole, it will be split into two.
	 * @param  {Polygon} other The polygon to subtract.
	 * @return {Polygon[]}       An array of result polygons.
	 */
	subtract(other) {
		return oper(this, other, 'difference').map(poly => new Polygon(poly));
	}

	/**
	 * Creates the union of two polygons. The two must be co-planar, or an error will be thrown. 
	 *
	 * If the result would have a hole, it will be split into two.
	 * @param  {Polygon} other The polygon to unite with.
	 * @return {Polygon[]}       An array of result polygons.
	 */
	add(other) {
		return oper(this, other, 'union').map(poly => new Polygon(poly));
	}

	isEmpty() { 
		return this.length === 0;
	}
	
	/**
	 * Tesselates this polygon into triangles.
	 * @return {Triangle[]} A list of triangles that the polygon was split into.
	 */
	tesselate() {
		return [ this ];
	}
}