/* eslint
    no-console: 0,
    no-param-reassign: 0,
    no-use-before-define: ["error", { "variables": false }],
    no-return-assign: 0,
    react/no-string-refs: 0
*/

import PropTypes from 'prop-types';
import React      from 'react';

import { FlatList, View, StyleSheet, Keyboard, Dimensions, Animated, Text, TouchableOpacity, Platform } from 'react-native';

import shallowequal from 'shallowequal';
import InvertibleScrollView from 'react-native-invertible-scroll-view';
import md5 from 'md5';
import LoadEarlier from './LoadEarlier';
import Message from './Message';

import Icon from 'react-native-vector-icons/FontAwesome';
import IconBadge                   from 'react-native-icon-badge';
import RotateText                  from "react-native-ticker";
export default class MessageContainer extends React.Component {

  constructor(props) {
    super(props);

    this.renderRow            = this.renderRow.bind(this);
    this.renderFooter         = this.renderFooter.bind(this);
    //this.renderHeader         = this.renderHeader.bind(this);
    this.renderLoadEarlier    = this.renderLoadEarlier.bind(this);

    this.onLayout             = this.onLayout.bind(this)
  //  this.onOutterViewLayout   = this.onOutterViewLayout.bind(this)

    this.onScrollEnd          = this.onScrollEnd.bind(this)
    this.onScroll             = this.onScroll.bind(this)
    //this.onKeyboardDidShow    = this.onKeyboardDidShow.bind(this);
    //this.onKeyboardDidHide    = this.onKeyboardDidHide.bind(this);
    this.onKeyboardChange     = this.onKeyboardChange.bind(this);

    this.onContentSizeChange  = this.onContentSizeChange.bind(this);

    console.log('-->INIT CHAT Step 1 <--');

    this.listObj = {
      height              : Dimensions.get('window').height - 54 - this.props.inputToolbarHeight,
      scrollPos           : 0,
      contentHeight       : 0,
      autoScroll          : true,
      shouldScroll        : (this.props.messages.length != 0) ? true : false,
      scrollToBottomIcon  : false,
      offset              : 0,
      isLoadingEarlier    : false
    }

    const messagesData = this.prepareMessages(props.messages.reverse());

    this.state = {
      dataSource          : messagesData,
      newMessagesCounter  : 0,
      init                : false,
      opacity             : new Animated.Value(0),
    };
  }
  componentWillMount(){
    //this.keyboardDidShowListener         = Keyboard.addListener('keyboardDidShow', this.onKeyboardDidShow);
    //this.keyboardDidHideListener         = Keyboard.addListener('keyboardDidHide', this.onKeyboardDidHide);
    this.keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', this.onKeyboardChange)
  }
  componentWillUnmount(){
    console.log('(componentWillUnmount) Message container');
    //this.keyboardDidShowListener.remove();
    //this.keyboardDidHideListener.remove();
    this.keyboardWillChangeFrameListener.remove();
  }
  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps ');

    if ( nextProps.isLoadingEarlier ){
      this.listObj.isLoadingEarlier = true
    } else if ( !nextProps.isLoadingEarlier && !this.props.isLoadingEarlier ){
      this.listObj.isLoadingEarlier = false
    }

    if ( this.props.messages.length == nextProps.messages.length &&
         this.props.messages[this.props.messages.length - 1] != nextProps.messages[this.props.messages.length - 1]  ){

      const messagesData = this.prepareMessages(this.props.messages);
      this.setState({
        dataSource: messagesData,
      });
    }

    if ( this.props.messages.length == nextProps.messages.length || nextProps.messages.length == 0) {
      return;
    }

    console.log('this.listObj.isLoadingEarlier', this.listObj.isLoadingEarlier);

    if ( this.listObj.scrollToBottomIcon &&
         !this.listObj.isLoadingEarlier &&
         nextProps.messages.length > this.props.messages.length ){
      if ( nextProps.messages[0].user._id == this.props.user._id ){
        this.scrollToBottom( this.listObj.contentHeight - this.listObj.height, true);
      }
      else
        this.setState({
          newMessagesCounter: this.state.newMessagesCounter + (1)
        })
    }

    const messagesData = this.prepareMessages(nextProps.messages.reverse());

    this.setState({
      dataSource: messagesData,
    });
  }
  onKeyboardChange(e) {
    //console.log('onKeyboardChange', e) ;
    const { endCoordinates, startCoordinates } = e;

    if ( endCoordinates.screenY < startCoordinates.screenY ){
      if ( !this.listObj.autoScroll )
        this.scrollToBottom( this.listObj.offset + startCoordinates.height, true);
    } else {
      console.log('Keyboard CLOSED');
    }
  }
  shouldComponentUpdate(nextProps, nextState) {

    if (!shallowequal(this.props, nextProps)) {
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
              const previousMessage = messages[i - 1] || {};
              const nextMessage = messages[i + 1] || {};
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
    const { layout } = e.nativeEvent;
    console.log('(onLayout) List height: ', layout.height);
    console.log('(onLayout) List content height: ', this.listObj.contentHeight);
    this.listObj.height = layout.height;

    if ( this.listObj.contentHeight > this.listObj.height ){
      if ( this.listObj.isLoadingEarlier ){
        console.log('(onLayout) STAY IN PLACE');
        this.togglescrollToBottomIcon()
      } else {
        console.log('(onLayout) Scroll to bottom');
        if ( this.listObj.autoScroll )
          this.scrollToBottom( this.listObj.contentHeight - this.listObj.height);
      }
    }

    if ( this.listObj.contentHeight < this.listObj.height &&
         this.listObj.scrollToBottomIcon ){
      this.togglescrollToBottomIcon()
    }
  }

  togglescrollToBottomIcon(){
    if ( this.listObj.scrollToBottomIcon ){
      Animated.timing(this.state.opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
      this.listObj.scrollToBottomIcon = false
    } else {
      Animated.timing(this.state.opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      this.listObj.scrollToBottomIcon = true
      this.listObj.autoScroll = false
    }

  }

  onContentSizeChange(contentWidth, contentHeight){
    console.log('(onContentSizeChange) List height:', this.listObj.height);
    console.log('(onContentSizeChange) List content height:', contentHeight);
    this.listObj.contentHeight = contentHeight

    if ( this.listObj.contentHeight > this.listObj.height ){
      if ( this.listObj.isLoadingEarlier ){
        console.log('(onContentSizeChange) STAY IN PLACE');
        this.togglescrollToBottomIcon()
      } else {
        console.log('(onContentSizeChange) Scroll to bottom');
        this.scrollToBottom( this.listObj.contentHeight - this.listObj.height);
      }
    }

    //this.scrollOffset = contentHeight - this.listObj.height;

    //if ( this.listObj.autoScroll ){
      //if ( this.listObj.height < contentHeight)
      //  this.scrollToBottom(contentHeight)
      //this.listObj,shouldScroll = false
    //}
  }
  onScrollEnd(e) {
    let contentOffset = e.nativeEvent.contentOffset;
    console.log('Scroll position:',contentOffset.y);
    this.listObj.offset    = contentOffset.y;
    this.listObj.scrollPos = contentOffset.y;
  }
  onScroll(e){
    let contentOffset = e.nativeEvent.contentOffset;
    var currentOffset = contentOffset.y;
    var direction = currentOffset > this.listObj.offset ? 'down' : 'up';

    this.listObj.offset = currentOffset;

    let diff = ((this.listObj.contentHeight - this.listObj.height) - this.listObj.offset);

    if ( direction == 'up' && !this.listObj.scrollToBottomIcon && diff > 80 ){
      this.togglescrollToBottomIcon()
    }

    if ( direction == 'down' && this.listObj.scrollToBottomIcon && diff < 70 ){
      this.togglescrollToBottomIcon()
      this.listObj.autoScroll = true;
      this.setState({
        newMessagesCounter: 0
      })
    }
  }
  scrollToBottom(contentHeight, scrollEnabled = this.listObj.autoScroll){
    console.log('scrollEnabled: ', scrollEnabled);

    if ( scrollEnabled )
      this._scrollViewRef.scrollToOffset({offset: contentHeight, animated:true});
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
                                        height: '100%', width:'100%',
                                        justifyContent: 'center', alignItems: 'center',}}
                                onPress={ () => {this.scrollToBottom(this.listObj.contentHeight - this.listObj.height, true) } } >
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
            left: 5 ,
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

    if (this.props.renderFooter) {
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
    return (
      <View onLayout={this.onOutterViewLayout} style={[styles.container,{marginBottom: this.props.inputToolbarHeight}]}>
          {this.scrollToBottomIcon()}
          <FlatList
            ref                   = {(component) => (this._scrollViewRef = component)}
            keyExtractor          = {this.keyExtractor}
            data                  = {this.state.dataSource}
            renderItem            = {this.renderRow}
            onLayout              = {this.onLayout}
            onMomentumScrollEnd   = {this.onScrollEnd}
            onScroll              = {this.onScroll}
            onScrollEndDrag       = {this.onScrollEnd}
            onContentSizeChange   = {this.onContentSizeChange}
            ListFooterComponent   = {this.renderFooter}
            ListHeaderComponent   = {this.renderLoadEarlier}
            style                 = {{backgroundColor: '#fff'}}
            contentContainerStyle = {{backgroundColor: '#fff'}}
          />
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor: '#000'
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
