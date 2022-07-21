import Vector from './vector.js';

export default class Mesh {
	constructor(faces) {
		this.faces = faces;
	}

	/**
	 * Cuts this mesh along the plane perpendicular to `dimension` at `offset`.
	 * @param  {String} dimension One of `'x'`, `'y'` or `'z'`.
	 * @param  {Number} offset    The offset at which to cut.
	 * @return {Mesh[]}		An array of meshes of two meshes that combined equal this mesh, but do
	 * not intersect with the cut plane (other than touching). Note that the meshes are not guaranteed
	 * to be contiguous even if the original mesh was. The first mesh is always that comprised of all
	 * faces on the greater-or-equal side of the cutplane, the second that with the less-or-equal ones.
	 */
	cut(dimension, offset) {
		let above = [];
		let below = [];
		let cutResults = this.faces.map(face => face.cut(dimension, offset));
			
		for (let cutResult of cutResults) {
			above = above.concat(cutResult.slice(0, cutResult.crossIndex));
			below = below.concat(cutResult.slice(cutResult.crossIndex));
		}
		return [
			new Mesh(above),
			new Mesh(below)
		];
	}

	crossSection(dimension, offset) {
		let [ above, below ] = this.cut(dimension, offset);
		let target = above.isEmpty() ? below : above;
		
		target = target.faces.filter(face => face.some(vertex => vertex[dimension] === offset));
		return target.map(face => face.filter(vertex => vertex[dimension] === offset));
	}

	rayIntersect(ray) {
		this.faces.some(face => face.rayIntersect(ray));
	}

	/**
	 * Splits this mesh into contiguous sub meshes.
	 * @return {Mesh[]} An array of contiguous meshes that combined equal this mesh.
	 */
	split() {
		/* 
			This algorithm works somewhat like a flood fill.
			It starts by selecting an arbitrary face of the mesh, and then consecutively
			adding all other faces that share at least one vertex with an already selected face.

			When no such faces exist any more, but not all faces of the mesh are accounted for,
			it creates a new submesh and repeats the algorithm, starting with one of the remaining
			faces.

			It does this until all faces of the original mesh have been assigned to submeshes.
		 */
		
		// The faces of the original mesh that are not yet assigned to a submesh
		let remaining = this.faces.slice(); // Shallow copy
		// The faces that were selected in the previous step
		let selected = [];
		// The resulting array of submeshes
		const result = [];
		// The current submesh
		let current;
		while (remaining.length > 0) {
			// If no pieces are currently selected, we have found a new submesh.
			if (selected.length === 0) {
				// Start a new submesh
				current = [];
				// Add it to the result
				result.push(current);
				// Select an arbitrary unprocessed face to start the algorithm. We just take the first.
				selected = [ remaining[0] ];
			}
			// Add the selected faces to the current submesh
			current.splice(current.length, 0 , ...selected);
			// Remove the selected faces from those that are still in need of processing
			remaining = remaining.filter(face => !selected.includes(face));
			// From the remaining unprocessed faces, select those share at least one vertex with some 
			// face selected in the last step.
			selected = remaining.filter(
				remainingFace => selected.some(selectedFace => 
					remainingFace.some(vr => 
					selectedFace.some(vs => vr.equals(vs)))
				)
			);
		}

		return result.map(submesh => new Mesh(submesh));
	}

	/**
	 * Whether or not this mesh is contiguous. 
	 * 
	 * A mesh is contiguous if for any two vertices v1 and v2 of the mesh, there is a sequence of edges
	 * connecting v1 and v2.
	 * @return {Boolean} `true` if this mesh is contiguous, `false` otherwise.
	 */
	isContiguous() {
		return this.split().length > 1;
	}

	isEmpty() {
		return this.faces.length === 0;
	}

	// get vertices() {
	// 	return this.faces.flat();
	// }

	/**
	 * The orientation of the mesh. This describes in which dimension the mesh is primarily oriented.
	 * @return {String} One of
	 * - `'longitudinal'`: The mesh is primarily in the yz plane
	 * - `'deck'`: The mesh is primarily in the xy plane
	 * - `'transverse'`: The mesh is primarily in the xz plane
	 * - `'unknown'`: The meshes primary direction could not be determined, or the mesh is at exactly
	 * 45 degrees between two planes.
	 */
	get orientation() {
		let aggregateNormal = this.faces
			.map(face => face.normal)
			.reduce((prev, curr) => prev.add(curr), Vector.ZERO);
		if (Math.abs(aggregateNormal.x) > Math.abs(aggregateNormal.y) && Math.abs(aggregateNormal.x) > Math.abs(aggregateNormal.z))
			return 'longitudinal';
		else if (Math.abs(aggregateNormal.y) > Math.abs(aggregateNormal.x) && Math.abs(aggregateNormal.y) > Math.abs(aggregateNormal.z))
			return 'deck';
		else if (Math.abs(aggregateNormal.z) > Math.abs(aggregateNormal.x) && Math.abs(aggregateNormal.z) > Math.abs(aggregateNormal.y))
			return 'transverse';
		else
			return 'unknown';	
	}

	get vertices() {
		return [].concat(...this.faces);
	}

	getBoundingBox() {
		let result = {};
		['x','y','z'].forEach(dim => result[`${dim}min`] = Number.POSITIVE_INFINITY);
		['x','y','z'].forEach(dim => result[`${dim}max`] = Number.NEGATIVE_INFINITY);
		for (let v of this.vertices) {
			for (let dim of ['x','y','z']) {
				if (v[dim] > result[`${dim}max`]) result[`${dim}max`] = v[dim];
				if (v[dim] < result[`${dim}min`]) result[`${dim}min`] = v[dim];
			}
		}
		return result;
	}

}

module.exports = Mesh;