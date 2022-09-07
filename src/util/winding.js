import sign from './sign.js';

/**
 * Calculates the winding order of the given 2D vertices. The result is -1 if the winding is 
 * counter-clockwise, and +1 if it is clockwise.
 * @param  {Vector[]} vertices The vertices whose winding direction to determine.
 * @return {number}   -1 if `vertices` is wound counter-clockwise, +1 if `vertices` is wound 
 * clockwise. 0 if all vertices are collinear.
 */
export default function winding(vertices) {
	if (vertices.length < 3) return undefined;

	let area = 0;
	for (let i = 0; i < vertices.length; i++) {
		let v1 = vertices[i];
		let v2 = vertices[(i + 1) % vertices.length];
		area += (v2.x - v1.x) * (v2.y + v1.y);
	}
	return sign(area); 
}