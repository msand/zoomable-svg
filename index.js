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
    case 'start':
      return 0;

    default:
    case 'mid':
      return 1;

    case 'end':
      return 2;
  }
}

export default class ZoomableSvg extends Component {
  state = {
    zoom: 1,
    left: 0,
    top: 0,
  };

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

      const touchZoom = distance / initialDistance;
      const dx = x - initialX;
      const dy = y - initialY;

      const left = (initialLeft + dx - x) * touchZoom + x;
      const top = (initialTop + dy - y) * touchZoom + y;
      const zoom = initialZoom * touchZoom;

      this.setState({
        zoom,
        left,
        top,
      });
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
      const { initialX, initialY, initialLeft, initialTop } = this.state;
      const dx = x - initialX;
      const dy = y - initialY;
      this.setState({
        left: initialLeft + dx,
        top: initialTop + dy,
      });
    }
  }

  componentWillMount() {
    const noop = () => {};
    const yes = () => true;
    const moveThreshold = this.props.moveThreshold || 5;
    const shouldRespond = (evt, { dx, dy }) => {
      return (
        evt.nativeEvent.touches.length === 2 ||
        dx * dx + dy * dy >= moveThreshold
      );
    };
    this._panResponder = PanResponder.create({
      onPanResponderGrant: noop,
      onPanResponderTerminate: noop,
      onShouldBlockNativeResponder: yes,
      onPanResponderTerminationRequest: yes,
      onMoveShouldSetPanResponder: shouldRespond,
      onStartShouldSetPanResponder: shouldRespond,
      onMoveShouldSetPanResponderCapture: shouldRespond,
      onStartShouldSetPanResponderCapture: shouldRespond,
      onPanResponderMove: evt => {
        const touches = evt.nativeEvent.touches;
        const length = touches.length;
        if (length === 1) {
          const [{ locationX, locationY }] = touches;
          this.processTouch(locationX, locationY);
        } else if (length === 2) {
          const [touch1, touch2] = touches;
          this.processPinch(
            touch1.locationX,
            touch1.locationY,
            touch2.locationX,
            touch2.locationY,
          );
        }
      },
      onPanResponderRelease: () => {
        this.setState({
          isZooming: false,
          isMoving: false,
        });
      },
    });
  }

  render() {
    const { height, width, align, svgRoot: Child, viewBoxSize } = this.props;
    const minDimension = Math.min(height, width);
    const resolution = viewBoxSize / minDimension;
    const { left, top, zoom } = this.state;
    const alignmentAmount = getAlignment(align);
    const offsetX = alignmentAmount * zoom * (width - minDimension) / 2;
    const offsetY = alignmentAmount * zoom * (height - minDimension) / 2;
    return (
      <View {...this._panResponder.panHandlers}>
        <Child
          transform={{
            translateX: (left + offsetX) * resolution,
            translateY: (top + offsetY) * resolution,
            scale: zoom,
          }}
        />
      </View>
    );
  }
}
