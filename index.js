import React, { Component } from 'react';
import { View, PanResponder } from 'react-native';
// Based on https://gist.github.com/evgen3188/db996abf89e2105c35091a3807b7311d

function calcDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function middle(p1, p2) {
  return (p1 + p2) / 2;
}

function calcCenter(x1, y1, x2, y2) {
  return {
    x: middle(x1, x2),
    y: middle(y1, y2),
  };
}

function getAlignment(align) {
  switch (align) {
    case 'min':
    case 'start':
      return 'xMinYMin';

    case 'mid':
      return 'xMidYMid';

    case 'max':
    case 'end':
      return 'xMaxYMax';

    default:
      return align || 'xMidYMid';
  }
}

function getTransform(vbRect, eRect, align, meetOrSlice) {
  // based on https://svgwg.org/svg2-draft/coords.html#ComputingAViewportsTransform

  // Let vb-x, vb-y, vb-width, vb-height be the min-x, min-y, width and height values of the viewBox attribute respectively.
  const vbX = vbRect.left || 0;
  const vbY = vbRect.top || 0;
  const vbWidth = vbRect.width;
  const vbHeight = vbRect.height;

  // Let e-x, e-y, e-width, e-height be the position and size of the element respectively.
  const eX = eRect.left || 0;
  const eY = eRect.top || 0;
  const eWidth = eRect.width;
  const eHeight = eRect.height;

  // Initialize scale-x to e-width/vb-width.
  let scaleX = eWidth / vbWidth;

  // Initialize scale-y to e-height/vb-height.
  let scaleY = eHeight / vbHeight;

  // Initialize translate-x to e-x - (vb-x * scale-x).
  // Initialize translate-y to e-y - (vb-y * scale-y).
  let translateX = eX - vbX * scaleX;
  let translateY = eY - vbY * scaleY;

  // If align is 'none'
  if (align === 'none') {
    // Let scale be set the smaller value of scale-x and scale-y.
    // Assign scale-x and scale-y to scale.
    const scale = (scaleX = scaleY = Math.min(scaleX, scaleY));

    // If scale is greater than 1
    if (scale > 1) {
      // Minus translateX by (eWidth / scale - vbWidth) / 2
      // Minus translateY by (eHeight / scale - vbHeight) / 2
      translateX -= (eWidth / scale - vbWidth) / 2;
      translateY -= (eHeight / scale - vbHeight) / 2;
    } else {
      translateX -= (eWidth - vbWidth * scale) / 2;
      translateY -= (eHeight - vbHeight * scale) / 2;
    }
  } else {
    // If align is not 'none' and meetOrSlice is 'meet', set the larger of scale-x and scale-y to the smaller.
    // Otherwise, if align is not 'none' and meetOrSlice is 'slice', set the smaller of scale-x and scale-y to the larger.

    if (align !== 'none' && meetOrSlice === 'meet') {
      scaleX = scaleY = Math.min(scaleX, scaleY);
    } else if (align !== 'none' && meetOrSlice === 'slice') {
      scaleX = scaleY = Math.max(scaleX, scaleY);
    }

    // If align contains 'xMid', add (e-width - vb-width * scale-x) / 2 to translate-x.
    if (align.includes('xMid')) {
      translateX += (eWidth - vbWidth * scaleX) / 2;
    }

    // If align contains 'xMax', add (e-width - vb-width * scale-x) to translate-x.
    if (align.includes('xMax')) {
      translateX += eWidth - vbWidth * scaleX;
    }

    // If align contains 'yMid', add (e-height - vb-height * scale-y) / 2 to translate-y.
    if (align.includes('YMid')) {
      translateY += (eHeight - vbHeight * scaleY) / 2;
    }

    // If align contains 'yMax', add (e-height - vb-height * scale-y) to translate-y.
    if (align.includes('YMax')) {
      translateY += eHeight - vbHeight * scaleY;
    }
  }

  // The transform applied to content contained by the element is given by
  // translate(translate-x, translate-y) scale(scale-x, scale-y).
  return { translateX, translateY, scaleX, scaleY, eRect };
}

function getConstraints(props, viewBox) {
  const { constrain } = props;
  if (!constrain) {
    return null;
  }

  // Constraints
  const {
    combine = 'dynamic',
    scaleExtent = [0, Infinity],
    translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]],
  } = constrain;

  const [minZoom = 0, maxZoom = Infinity] = scaleExtent;

  const [
    min = [-Infinity, -Infinity],
    max = [Infinity, Infinity],
  ] = translateExtent;

  const [minX = -Infinity, minY = -Infinity] = min;
  const [maxX = Infinity, maxY = Infinity] = max;

  // Extent of constraints
  const ew = maxX - minX;
  const eh = maxY - minY;

  const { scaleX, scaleY, eRect: { width, height } } = viewBox;

  // Size of canvas in viewbox
  const vw = width / scaleX;
  const vh = height / scaleY;

  switch (combine) {
    default:
    case 'dynamic': {
      return {
        dynamic: [ew, eh],
        scaleExtent: [minZoom, maxZoom],
        translateExtent: [[minX, minY], [maxX, maxY]],
      };
    }
    case 'static': {
      return {
        dynamic: null,
        scaleExtent: [minZoom, maxZoom],
        translateExtent: [[minX, minY], [maxX, maxY]],
      };
    }
    case 'union': {
      // Max extent (at minZoom)
      const maxW = vw / minZoom;
      const maxH = vh / minZoom;

      // Amount of free space when zoomed out beyond a translateExtent
      const fx = Math.max(0, maxW - ew);
      const fy = Math.max(0, maxH - eh);

      // Union of constraints
      return {
        dynamic: null,
        scaleExtent: [minZoom, maxZoom],
        translateExtent: [[minX - fx, minY - fy], [maxX + fx, maxY + fy]],
      };
    }
    case 'intersect': {
      // Zoom which shows entire extent
      const wZoom = vw / ew;
      const hZoom = vh / eh;

      // Intersection of constraints
      const minAllowedZoom = Math.max(wZoom, hZoom, minZoom);

      return {
        dynamic: null,
        scaleExtent: [minAllowedZoom, maxZoom],
        translateExtent: [[minX, minY], [maxX, maxY]],
      };
    }
  }
}

function getNextState(props, state) {
  const {
    top,
    left,
    zoom,
    align,
    width,
    height,
    vbWidth,
    vbHeight,
    meetOrSlice = 'meet',
    eRect = { width, height },
    vbRect = { width: vbWidth || width, height: vbHeight || height },
  } = props;
  const { top: currTop, left: currLeft, zoom: currZoom } = state;
  const viewBox = getTransform(vbRect, eRect, getAlignment(align), meetOrSlice);
  return {
    constraints: getConstraints(props, viewBox),
    top: top || currTop,
    left: left || currLeft,
    zoom: zoom || currZoom,
    ...viewBox,
  };
}

function getZoomTransform({
  left,
  top,
  zoom,
  scaleX,
  scaleY,
  translateX,
  translateY,
}) {
  return {
    translateX: left + zoom * translateX,
    translateY: top + zoom * translateY,
    scaleX: zoom * scaleX,
    scaleY: zoom * scaleY,
  };
}

export default class ZoomableSvg extends Component {
  constructor(props) {
    super();
    this.state = getNextState(props, {
      zoom: props.initialZoom || 1,
      left: props.initialLeft || 0,
      top: props.initialTop || 0,
    });
  }

  componentWillReceiveProps(nextProps) {
    this.setState(getNextState(nextProps, this.state));
  }

  constrainExtent({ zoom, left, top }) {
    // Based on https://github.com/d3/d3-zoom/blob/3bd2bddd87d79bb5fc3984cfb59e36ebd1686dcf/src/zoom.js
    // Width and height of canvas in native device
    const {
      eRect: { width, height },
      constraints: {
        dynamic,
        scaleExtent: [minZoom, maxZoom],
        translateExtent: [min, max],
      },
    } = this.state;

    const constrainedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

    const { translateX, translateY, scaleX, scaleY } = getZoomTransform({
      ...this.state,
      zoom: constrainedZoom,
      left,
      top,
    });

    // Requested top left corner, width and height in root coordinates
    const vl = -translateX / scaleX;
    const vt = -translateY / scaleY;

    const vw = width / scaleX;
    const vh = height / scaleY;

    // Constraints
    let [minX, minY] = min;
    let [maxX, maxY] = max;

    if (dynamic) {
      // Extent of constraints
      const [ew, eh] = dynamic;

      // Amount of free space when zoomed out beyond a translateExtent
      const fx = Math.max(0, vw - ew);
      const fy = Math.max(0, vh - eh);

      minX -= fx;
      minY -= fy;

      maxX += fx;
      maxY += fy;
    }

    // Correction of top-left corner
    const dx0 = Math.max(vl, minX);
    const dy0 = Math.max(vt, minY);

    // Correction of bottom-right corner
    const dx1 = Math.min(vl, maxX - vw);
    const dy1 = Math.min(vt, maxY - vh);

    // Handle zooming out beyond translateExtent (if scaleExtent allows it)
    const x =
      dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1);
    const y =
      dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1);

    // Return corrected transform
    return {
      zoom: constrainedZoom,
      left: left + (vl - x) * scaleX,
      top: top + (vt - y) * scaleY,
    };
  }

  processPinch(x1, y1, x2, y2) {
    const distance = calcDistance(x1, y1, x2, y2);
    const { x, y } = calcCenter(x1, y1, x2, y2);

    if (!this.state.isZooming) {
      const { top, left, zoom } = this.state;
      this.setState({
        isZooming: true,
        initialX: x,
        initialY: y,
        initialTop: top,
        initialLeft: left,
        initialZoom: zoom,
        initialDistance: distance,
      });
    } else {
      const {
        initialX,
        initialY,
        initialTop,
        initialLeft,
        initialZoom,
        initialDistance,
      } = this.state;
      const { constrain } = this.props;

      const touchZoom = distance / initialDistance;
      const dx = x - initialX;
      const dy = y - initialY;

      const left = (initialLeft + dx - x) * touchZoom + x;
      const top = (initialTop + dy - y) * touchZoom + y;
      const zoom = initialZoom * touchZoom;

      const nextState = {
        zoom,
        left,
        top,
      };

      this.setState(constrain ? this.constrainExtent(nextState) : nextState);
    }
  }

  processTouch(x, y) {
    if (!this.state.isMoving || this.state.isZooming) {
      const { top, left } = this.state;
      this.setState({
        isMoving: true,
        isZooming: false,
        initialLeft: left,
        initialTop: top,
        initialX: x,
        initialY: y,
      });
    } else {
      const { initialX, initialY, initialLeft, initialTop, zoom } = this.state;
      const { constrain } = this.props;

      const dx = x - initialX;
      const dy = y - initialY;

      const nextState = {
        left: initialLeft + dx,
        top: initialTop + dy,
        zoom,
      };

      this.setState(constrain ? this.constrainExtent(nextState) : nextState);
    }
  }

  componentWillMount() {
    const noop = () => {};
    const yes = () => true;
    const { moveThreshold = 5, doubleTapThreshold } = this.props;
    const shouldRespond = (evt, { dx, dy }) => {
      return (
        evt.nativeEvent.touches.length === 2 ||
        dx * dx + dy * dy >= moveThreshold ||
        doubleTapThreshold
      );
    };
    let lastRelease = 0;
    this._panResponder = PanResponder.create({
      onPanResponderGrant: noop,
      onPanResponderTerminate: noop,
      onShouldBlockNativeResponder: yes,
      onPanResponderTerminationRequest: yes,
      onMoveShouldSetPanResponder: shouldRespond,
      onStartShouldSetPanResponder: shouldRespond,
      onMoveShouldSetPanResponderCapture: shouldRespond,
      onStartShouldSetPanResponderCapture: shouldRespond,
      onPanResponderMove: ({ nativeEvent: { touches } }) => {
        const { length } = touches;
        if (length === 1) {
          const [{ pageX, pageY }] = touches;
          this.processTouch(pageX, pageY);
        } else if (length === 2) {
          const [touch1, touch2] = touches;
          this.processPinch(
            touch1.pageX,
            touch1.pageY,
            touch2.pageX,
            touch2.pageY,
          );
        }
      },
      onPanResponderRelease: ({ nativeEvent: { timestamp } }, { x0, y0 }) => {
        const { doubleTapThreshold } = this.props;
        if (
          doubleTapThreshold &&
          timestamp - lastRelease < doubleTapThreshold
        ) {
          const {
            top: initialTop,
            left: initialLeft,
            zoom: initialZoom,
          } = this.state;
          const { constrain, doubleTapZoom = 2 } = this.props;

          const left = (initialLeft - x0) * doubleTapZoom + x0;
          const top = (initialTop - y0) * doubleTapZoom + y0;
          const zoom = initialZoom * doubleTapZoom;

          const nextState = {
            zoom,
            left,
            top,
          };

          this.setState(
            constrain ? this.constrainExtent(nextState) : nextState
          );
        }
        lastRelease = timestamp;
        this.setState({
          isZooming: false,
          isMoving: false,
        });
      },
    });
  }

  render() {
    const { svgRoot: Child, childProps } = this.props;
    return (
      <View {...this._panResponder.panHandlers}>
        <Child transform={getZoomTransform(this.state)} {...childProps} />
      </View>
    );
  }
}
