**This library is in an unfinished state but is no longer maintained.**

# geometry-3d

This is a JavaScript library for working with triangular meshes in three dimensions. 

## Install

```
npm install git+https://git@github.com/BadIdeaException/geometry-3d.git
```

## Usage

### Import

This package is designed to be used as an ESM import:

```
import { Triangle } from 'geometry-3d';
```

All floating-point comparisons are made using an epsilon-tolerance, which can be set during import time by appending it as a parameter to the import URL. For example, to set the tolerance to `1.0e-10`, import it like this:
```
import { Triangle } from 'geometry-3d?epsilon=1.8e-10';
```
The default value is `1.0e-8`.

### API

This library is designed for working with triangular meshes, so the `Triangle` is the core building block of this library. There is also a class `Polygon` (actually `Triangle` extends `Polygon`), but it is meant for intermediate results. In particular, `Mesh`es consist of triangles, not polygons. Triangles support the following operations:

- They can be intersected in arbitrary orientations
- They can be added and subtracted if they are co-planar
- They can be cut into "above" and "below" parts by an arbitrary cut plane

## Tests

Automated unit tests using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) are available and can be run with `npm test`. 

## Dependencies & Acknowledgements

- Boolean operations on polygons use [`polygon-clipping`](https://github.com/mfogel/polygon-clipping).
- Polygon tesselation is performed using [`earcut`](https://github.com/mapbox/earcut)
- The algorithm for triangle intersections is based on the [work by Tomas Möller](https://dl.acm.org/doi/10.1080/10867651.1997.10487468)
- The algorithms for line-line intersection and plane-plane-plane intersection are based on the work by Ronald Goldman as printed in Andrew Glassner (Ed.), "Graphics Gems", Morgan Kaufman 2013, pp. 304&305, resp. 

## Contributing

This library currently only supports a small fraction of conceivable operations. If you have fixed a bug, or added a new feature, pull requests are welcome, provided they are fully tested and passing. In lieu of a formal style guide, please take care to preserve the existing style. 

## License

[MIT](https://github.com/BadIdeaException/geometry-3d/blob/master/LICENSE)
