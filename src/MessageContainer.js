/* eslint
    no-console: 0,
    no-param-reassign: 0,
    no-use-before-define: ["error", { "variables": false }],
    no-return-assign: 0,
    react/no-string-refs: 0
*/

import PropTypes from 'prop-types';
import React      from 'react';
const _          = require('underscore');
const __     = require('lodash');
import { FlatList, View, StyleSheet, Keyboard, Dimensions, Animated, Text, TouchableOpacity, Platform } from 'react-native';

import shallowequal from 'shallowequal';
import InvertibleScrollView from 'react-native-invertible-scroll-view';
import md5 from 'md5';
import LoadEarlier from './LoadEarlier';
import Message from './Message';

import Icon from 'react-native-vector-icons/FontAwesome';
import IconBadge                   from 'react-native-icon-badge';
import RotateText                  from "react-native-ticker";
var deepDiffMapper = function() {
    return {
        VALUE_CREATED: 'created',
        VALUE_UPDATED: 'updated',
        VALUE_DELETED: 'deleted',
        VALUE_UNCHANGED: 'unchanged',
        map: function(obj1, obj2) {
            if (this.isFunction(obj1) || this.isFunction(obj2)) {
                throw 'Invalid argument. Function given, object expected.';
            }
            if (this.isValue(obj1) || this.isValue(obj2)) {
                return {
                    type: this.compareValues(obj1, obj2),
                    data: (obj1 === undefined) ? obj2 : obj1
                };
            }

            var diff = {};
            for (var key in obj1) {
                if (this.isFunction(obj1[key])) {
                    continue;
                }

                var value2 = undefined;
                if ('undefined' != typeof(obj2[key])) {
                    value2 = obj2[key];
                }

                diff[key] = this.map(obj1[key], value2);
            }
            for (var key in obj2) {
                if (this.isFunction(obj2[key]) || ('undefined' != typeof(diff[key]))) {
                    continue;
                }

                diff[key] = this.map(undefined, obj2[key]);
            }

            return diff;

        },
        compareValues: function(value1, value2) {
            if (value1 === value2) {
                return this.VALUE_UNCHANGED;
            }
            if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
            		return this.VALUE_UNCHANGED;
            }
            if ('undefined' == typeof(value1)) {
                return this.VALUE_CREATED;
            }
            if ('undefined' == typeof(value2)) {
                return this.VALUE_DELETED;
            }

            return this.VALUE_UPDATED;
        },
        isFunction: function(obj) {
            return {}.toString.apply(obj) === '[object Function]';
        },
        isArray: function(obj) {
            return {}.toString.apply(obj) === '[object Array]';
        },
        isObject: function(obj) {
            return {}.toString.apply(obj) === '[object Object]';
        },
        isDate: function(obj) {
            return {}.toString.apply(obj) === '[object Date]';
        },
        isValue: function(obj) {
            return !this.isObject(obj) && !this.isArray(obj);
        }
    }
}();
export default class MessageContainer extends React.Component {

  constructor(props) {
    super(props);

    this.renderRow            = this.renderRow.bind(this);
    this.renderFooter         = this.renderFooter.bind(this);
    this.renderLoadEarlier    = this.renderLoadEarlier.bind(this);

    this.onLayout             = this.onLayout.bind(this)
    this.onScroll             = this.onScroll.bind(this)
    this.onKeyboardChange     = this.onKeyboardChange.bind(this);
    this.onContentSizeChange  = this.onContentSizeChange.bind(this);

    console.log('-->INIT CHAT Step 1 <--');
    this.newMessages = null
    this.keyboardStatus = false;
    this.listObj = {
      autoScroll          : true,
      scrollToBottomIcon  : false,
    }

    const messagesData = this.prepareMessages(props.messages);

    this.state = {
      dataSource          : messagesData,
      newMessagesCounter  : 0,
      opacity             : new Animated.Value(0),
      init                : false,
    };
  }
  componentDidMount(){
    console.log('componentDidMount');
  }
  componentWillMount(){
    this.keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', this.onKeyboardChange)
  }
  componentWillUnmount(){
    console.log('(componentWillUnmount) Message container');
    this.keyboardWillChangeFrameListener.remove();
  }
  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps ');

    //let result = deepDiffMapper.map(nextProps.messages, this.props.messages);
    //console.log('Messages Container props diff:', result )
    console.log('Message: ', this.props.messages.length );
    console.log('Message nextProps: ', nextProps.messages.length );
    console.log('Message isEqual: ', __.isEqual(this.props.messages, nextProps.messages));

    if ( this.props.messages.length == nextProps.messages.length &&
         this.props.messages.length != 0 && !this.state.init ){
      console.log('INIT COMPLETED WITH MESSAGES');
      this.setState({
        init: true
      })
    }

    if ( !_.isUndefined(this.props.messages[0]) )
      if ( this.props.messages[0]._id == this.state.dataSource[0]._id &&
           this.props.messages[0].voiceFileName != this.state.dataSource[0].voiceFileName  ){
         const messagesData = this.prepareMessages(this.props.messages);
          this.setState({
           dataSource: messagesData,
          });
       }

    if ( __.isEqual(this.props.messages, nextProps.messages) ){
      return
    }
    //if ( this.props.messages.length == nextProps.messages.length || nextProps.messages.length == 0) {
    //  return;
    //}

    const messagesData = this.prepareMessages(nextProps.messages);

    if ( nextProps.messages[0].user._id == this.props.user._id && this.keyboardStatus){
      this.scrollToBottom();
      this.setState({ dataSource: messagesData });
    }

    if ( nextProps.messages[0].user._id != this.props.user._id &&
         !this.listObj.autoScroll &&
         !this.props.isLoadingEarlier ){
      this.newMessages = messagesData;
      this.setState({
        newMessagesCounter: this.state.newMessagesCounter + (1)
      })
    }

    if ( this.listObj.autoScroll || this.props.isLoadingEarlier){
      this.setState({ dataSource: messagesData });
    }
  }
  onKeyboardChange(e) {
    const { endCoordinates, startCoordinates } = e;

    if ( endCoordinates.screenY < startCoordinates.screenY ){
      console.log('Open Keyboard');
      this.keyboardStatus = true
      if ( this.state.dataSource.length == 0 ){
        this.setState({
          init: true
        })
      }
    } else {
      console.log('Close Keyboard');
      this.keyboardStatus = false
    }

  }
  shouldComponentUpdate(nextProps, nextState) {

    if (!__.isEqual(this.props, nextProps)) {
      console.log('shouldComponentUpdate props new: true');
      return true;
    }
    if (!shallowequal(this.state, nextState)) {
      console.log('shouldComponentUpdate state new: true');
      return true;
    }
    console.log('shouldComponentUpdate: false');
    return false;
  }
  prepareMessages(messages) {
    return messages.reduce((o, m, i) => {
              const previousMessage = messages[i + 1] || {};
              const nextMessage = messages[i - 1] || {};
              // add next and previous messages to hash to ensure updates
              const toHash = JSON.stringify(m) + previousMessage._id + nextMessage._id;

              o.push({
                ...m,
                previousMessage,
                nextMessage,
                hash: md5(toHash),
              });
              return o;
            }, [])
  }
  keyExtractor = (item, index) => {
    return item.hash
  }
  renderRow({item, index}) {
    let message = item

    if (!message._id && message._id !== 0) {
      console.warn('GiftedChat: `_id` is missing for message', JSON.stringify(message));
    }
    if (!message.user) {
      if (!message.system) {
        console.warn('GiftedChat: `user` is missing for message', JSON.stringify(message));
      }
      message.user = {};
    }

    const messageProps = {
      ...this.props,
      key: message._id,
      chatInit: this.state.init,
      currentMessage: message,
      previousMessage: message.previousMessage,
      nextMessage: message.nextMessage,
      position: message.user._id === this.props.user._id ? 'right' : 'left',
    };

    if (this.props.renderMessage) {
      return this.props.renderMessage(messageProps);
    }
    return <Message {...messageProps} />;
  }
  onLayout(e) {
    console.log('onLayout');
    const { layout } = e.nativeEvent;
  }
  togglescrollToBottomIcon(status){
    if ( !status ){
      Animated.timing(this.state.opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start( ()=> this.setState({ newMessagesCounter: 0}) );
    } else {
      Animated.timing(this.state.opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }

  onContentSizeChange(contentWidth, contentHeight){
    console.log('onContentSizeChange');
    console.log('contentHeight', contentHeight);
  }

  onScroll(e){
    let contentOffset = e.nativeEvent.contentOffset;
    var currentOffset = contentOffset.y;

    if ( contentOffset.y > 50 ){
      this.togglescrollToBottomIcon(true)
      this.listObj.autoScroll = false;
    } else {
      if ( !_.isNull(this.newMessages) ){
        this.setState({
           dataSource: this.newMessages
        })
        this.newMessages = null
      }
      this.togglescrollToBottomIcon(false)
      this.listObj.autoScroll = true;
    }
  }
  scrollToBottom(){
    console.log('scrollToBottom');
    this._scrollViewRef.scrollToOffset({offset: 0, animated:true});
  }
  scrollToBottomIcon(){
    return(
      <Animated.View style={[styles.scrollToBottomIcon,
                            {opacity: this.state.opacity,
                             transform: [{
                               scale: this.state.opacity.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0.85, 1],
                               })
                             },
                           ],}]}
                     ref={this.handleViewRef}>
        <IconBadge
          MainElement={
              <TouchableOpacity style={{zIndex:9999,
                                        height: 30, width:30,
                                        justifyContent: 'center', alignItems: 'center',}}
                                onPress={ () => {
                                  if ( !_.isNull(this.newMessages) ){
                                    this.setState({
                                       dataSource: this.newMessages
                                    })
                                    this.newMessages = null
                                  }
                                  this.scrollToBottom()
                                } }>
                <Icon name="angle-down" size={15} color="#277d9f" />
              </TouchableOpacity>
          }
          BadgeElement={
            <RotateText text={this.state.newMessagesCounter.toString()}
                        allowFontScaling={false}
                        textStyle={{fontSize: 10,
                                    color:'#FFFFFF',
                                    textAlign: 'center'}}
                        rotateTime={250} />
          }
          IconBadgeStyle={{
            height:15,
            right: -5 ,
            top: -5,
            position:'absolute',
            paddingHorizontal: 5,
            backgroundColor: '#cc1e40'
          }}
          Hidden={ (this.state.newMessagesCounter == 0) ? true : false }
        />
      </Animated.View>
    )
  }
  renderFooter() {

    if (this.props.renderFooter && this.listObj.autoScroll) {
      console.log('Rendering footer');
      const footerProps = {
        ...this.props,
      };
      return this.props.renderFooter(footerProps);
    }
    return null;
  }

  renderLoadEarlier() {
      if (this.props.loadEarlier === true) {
        const loadEarlierProps = {
          ...this.props,
        };
        if (this.props.renderLoadEarlier) {
          return this.props.renderLoadEarlier(loadEarlierProps);
        }
        return <LoadEarlier {...loadEarlierProps} />;
      }
      return null;
    }

  render() {
    console.log('RENDER');

    return (
      <View style={[styles.container,{marginBottom: this.props.inputToolbarHeight}]}>
          {this.scrollToBottomIcon()}
          <FlatList
            ref                   = {(component) => (this._scrollViewRef = component)}
            keyExtractor          = {this.keyExtractor}
            bounces               = {false}
            data                  = {this.state.dataSource}
            renderItem            = {this.renderRow}
            onLayout              = {this.onLayout}
            onMomentumScrollEnd   = {this.onScrollEnd}
            onScroll              = {this.onScroll}
            onContentSizeChange   = {this.onContentSizeChange}
            ListFooterComponent   = {this.renderLoadEarlier}
            ListHeaderComponent   = {this.renderFooter}
            style                 = {{backgroundColor: '#FFF'}}
            contentContainerStyle = {{backgroundColor: '#FFF'}}
            inverted              = {true}
          />
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {

    backgroundColor: 'blue',

  },
  notInvertedContentContainerStyle: {
    justifyContent: 'flex-end',
  },
  scrollToBottomIcon:{
    borderWidth: 1,
    borderRadius: 15,
    borderColor:'#277d9f',
    height: 30, width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 99,
    right: 20,
    bottom: 20,
    backgroundColor:'#FFF'
  }
});

MessageContainer.defaultProps = {
  messages: [],
  user: {},
  renderFooter: null,
  renderMessage: null,
  onLoadEarlier: () => { },
  inverted: true,
  loadEarlier: false,
  listViewProps: {},
};

MessageContainer.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object),
  user: PropTypes.object,
  renderFooter: PropTypes.func,
  renderMessage: PropTypes.func,
  renderLoadEarlier: PropTypes.func,
  onLoadEarlier: PropTypes.func,
  listViewProps: PropTypes.object,
  inverted: PropTypes.bool,
  loadEarlier: PropTypes.bool,
};
