# ZoomableSvg
Pinch to pan-n-zoom react-native-svg components using a render prop.

[Example](https://snack.expo.io/@msand/zoomablesvg-with-childprops,-constrain-and-animation)

```jsx harmony
import React, { Component } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { Svg } from 'expo';

import ZoomableSvg from 'zoomable-svg'; // 2.2.0

const { G, Circle, Path, Rect } = Svg;

const { width, height } = Dimensions.get('window');
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const noop = () => {};

class SvgRoot extends Component {
  state = {
    toggle: false,
    initAnim: new Animated.Value(0),
  };

  componentDidMount() {
    Animated.timing(
      // Animate over time
      this.state.initAnim,
      {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }
    ).start();
  }

  onToggle = () => {
    this.setState(({ toggle }) => ({ toggle: !toggle }));
    const { onToggle } = this.props;
    if (onToggle) {
      onToggle();
    }
  };

  render() {
    const { toggle, initAnim } = this.state;
    let translateRectY = initAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0', '50'],
    });
    const { transform } = this.props;
    return (
      <Svg width={width} height={height}>
        <G transform={transform}>
          <AnimatedRect
            y={translateRectY}
            x="5"
            width="90"
            height="90"
            fill="rgb(0,0,255)"
            strokeWidth="3"
            stroke="rgb(0,0,0)"
          />
          <Rect
            x="5"
            y="5"
            width="55"
            height="55"
            fill="white"
            onPressIn={alert}
          />
          <Circle
            cx="32"
            cy="32"
            r="4.167"
            fill={toggle ? 'red' : 'blue'}
            onPress={this.onToggle}
          />
          <Path
            d="M55.192 27.87l-5.825-1.092a17.98 17.98 0 0 0-1.392-3.37l3.37-4.928c.312-.456.248-1.142-.143-1.532l-4.155-4.156c-.39-.39-1.076-.454-1.532-.143l-4.928 3.37a18.023 18.023 0 0 0-3.473-1.42l-1.086-5.793c-.103-.543-.632-.983-1.185-.983h-5.877c-.553 0-1.082.44-1.185.983l-1.096 5.85a17.96 17.96 0 0 0-3.334 1.393l-4.866-3.33c-.456-.31-1.142-.247-1.532.144l-4.156 4.156c-.39.39-.454 1.076-.143 1.532l3.35 4.896a18.055 18.055 0 0 0-1.37 3.33L8.807 27.87c-.542.103-.982.632-.982 1.185v5.877c0 .553.44 1.082.982 1.185l5.82 1.09a18.013 18.013 0 0 0 1.4 3.4l-3.31 4.842c-.313.455-.25 1.14.142 1.53l4.155 4.157c.39.39 1.076.454 1.532.143l4.84-3.313c1.04.563 2.146 1.02 3.3 1.375l1.096 5.852c.103.542.632.982 1.185.982h5.877c.553 0 1.082-.44 1.185-.982l1.086-5.796c1.2-.354 2.354-.82 3.438-1.4l4.902 3.353c.456.313 1.142.25 1.532-.142l4.155-4.154c.39-.39.454-1.076.143-1.532l-3.335-4.874a18.016 18.016 0 0 0 1.424-3.44l5.82-1.09c.54-.104.98-.633.98-1.186v-5.877c0-.553-.44-1.082-.982-1.185zM32 42.085c-5.568 0-10.083-4.515-10.083-10.086 0-5.568 4.515-10.084 10.083-10.084 5.57 0 10.086 4.516 10.086 10.083 0 5.57-4.517 10.085-10.086 10.085z"
            fill="blue"
            onPress={noop}
          />
        </G>
      </Svg>
    );
  }
}

const constrain = {
  scaleExtent: [width / height, 5],
  translateExtent: [[0, 0], [100, 100]],
};

export default class App extends Component {
  state = { constrain: true };

  onToggle = () =>
    this.setState(({ constrain }) => ({
      constrain: !constrain,
    }));

  childProps = { onToggle: this.onToggle };

  render() {
    return (
      <View style={styles.container}>
        <ZoomableSvg
          align="mid"
          vbWidth={100}
          vbHeight={100}
          width={width}
          height={height}
          meetOrSlice="slice"
          svgRoot={SvgRoot}
          childProps={this.childProps}
          constrain={this.state.constrain ? constrain : null}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ecf0f1',
  },
});
```
