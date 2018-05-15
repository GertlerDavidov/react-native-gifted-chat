/* eslint
    no-console: 0,
    no-param-reassign: 0,
    no-use-before-define: ["error", { "variables": false }],
    no-return-assign: 0,
    react/no-string-refs: 0
*/

import PropTypes from 'prop-types';
import React from 'react';

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
    this.renderHeader         = this.renderHeader.bind(this);
    this.renderLoadEarlier    = this.renderLoadEarlier.bind(this);

    this.onLayout             = this.onLayout.bind(this)
    this.onOutterViewLayout   = this.onOutterViewLayout.bind(this)

    this.onScrollEnd          = this.onScrollEnd.bind(this)
    this.onScroll             = this.onScroll.bind(this)

    this.onKeyboardDidShow    = this.onKeyboardDidShow.bind(this);
    this.onKeyboardDidHide    = this.onKeyboardDidHide.bind(this);
    this.onKeyboardChange     = this.onKeyboardChange.bind(this);

    this.onContentSizeChange  = this.onContentSizeChange.bind(this);

    this.scrollOffset         = 0;
    this.scrollToBottomIconV  = false;

    console.log('-->INIT CHAT Step 1 <--');
    console.log('Load messages count: ', this.props.messages.length);
    console.log('InputToolbar Height: ', this.props.inputToolbarHeight);
    console.log('listParentHeight/listHeight: ', Dimensions.get('window').height - 54 - this.props.inputToolbarHeight);
    console.log('--> END INIT CHAT <--');
    const messagesData = this.prepareMessages(props.messages.reverse());

    this.state = {
      dataSource: messagesData,
      listContentHeight: 0,
      listScrollPosition: 0,
      listParentHeight: Dimensions.get('window').height - 54 - this.props.inputToolbarHeight,
      listHeight: Dimensions.get('window').height - 54 - this.props.inputToolbarHeight,

      autoScroll: true,
      newMessagesCounter: 0,
      shouldScroll: (this.props.messages.length != 0) ? true : false,
      init: false,
      opacity: new Animated.Value(0),
    };
  }
  componentWillMount(){
    this.keyboardDidShowListener         = Keyboard.addListener('keyboardDidShow', this.onKeyboardDidShow);
    this.keyboardDidHideListener         = Keyboard.addListener('keyboardDidHide', this.onKeyboardDidHide);
    this.keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', this.onKeyboardChange)
  }
  componentWillUnmount(){
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
    this.keyboardWillChangeFrameListener.remove();
  }

  onKeyboardChange(e) {
    //console.log('onKeyboardChange', e) ;
    const { endCoordinates, startCoordinates } = e;
    console.log(e);
    if ( endCoordinates.screenY < startCoordinates.screenY ){
      this.onListLayoutChange(false, startCoordinates.height)
    } else {
      console.log('Keyboard CLOSED');
      this.onListLayoutChange(true, startCoordinates.height)
    }

  }
  onKeyboardDidShow(e) {
  }
  onKeyboardDidHide(e) {
  }

  onListLayoutChange(growStatus, changedHeight){
    if ( !growStatus ){
      let offset = 0;
      console.log('Keyboard opend');
      console.log('listContentHeight: ' + this.state.listContentHeight);
      console.log('listHeight: ' + this.state.listHeight);
      console.log('listScrollPosition: ' + this.state.listScrollPosition);
      console.log('---------------------');

      this.setState({
        listParentHeight:this.state.listParentHeight - changedHeight,
        listHeight: this.state.listHeight - changedHeight
      })

      console.log('listHeight: ' + this.state.listHeight);
      console.log('listContentHeight: ' + this.state.listContentHeight);

      if ( this.state.listContentHeight > this.state.listHeight ){
        console.log('Content longer then list');
        console.log('listScrollPosition: ', this.state.listScrollPosition);
        console.log('listScrollPosition: ', this.state.listContentHeight - this.state.listHeight);

        if ( this.state.listScrollPosition == this.state.listContentHeight - this.state.listHeight){
          console.log('Content position at bottom');
          offset = this.state.listContentHeight - ( this.state.listHeight - changedHeight );
        } else {

            console.log('Content position somewhere');
            //offset = this.state.listContentHeight - ( this.state.listHeight - endCoordinates.height ) - ( (this.state.listContentHeight - this.state.listHeight) - this.state.listScrollPosition );
            offset = this.state.listContentHeight - this.state.listHeight;
        }
      } else {
        console.log('Content shorter then list');
      //  offset = this.state.listContentHeight - ( this.state.listHeight - endCoordinates.height );
        offset = 0
      }
      console.log('Offset: ', offset);
      if ( offset <= 0 ){
         offset = 0
      }
      this._invertibleScrollViewRef.scrollToOffset({offset: offset, animated:true});
    }
    else {
      let newPos = this.state.listScrollPosition - (changedHeight);
      if ( newPos < 0 )
        newPos = 0
      this.setState({
        listParentHeight:this.state.listParentHeight + (changedHeight),
        listHeight: this.state.listHeight + (changedHeight),
        listScrollPosition: newPos
      })
    }

  }


  componentWillReceiveProps(nextProps) {

    if ( this.props.inputToolbarHeight != nextProps.inputToolbarHeight ){
      console.log('componentWillReceiveProps current inputToolbarHeight: ', this.props.inputToolbarHeight);
      console.log('componentWillReceiveProps next inputToolbarHeight: ', nextProps.inputToolbarHeight);
      if ( this.props.inputToolbarHeight < nextProps.inputToolbarHeight ){
        this.onListLayoutChange(false, nextProps.inputToolbarHeight - this.props.inputToolbarHeight)
      } else if ( this.props.inputToolbarHeight > nextProps.inputToolbarHeight ) {
                this.onListLayoutChange(true, this.props.inputToolbarHeight - nextProps.inputToolbarHeight)
             }
    }

    if (this.props.messages === nextProps.messages || nextProps.messages == 0) {
      return;
    }

    console.log('--> componentWillReceiveProps  <--');
    console.log('Current messages count: ', this.props.messages.length);
    console.log('New messages count: ', nextProps.messages.length);
    console.log('----------------------------------');

    if ( !this.state.autoScroll && nextProps.messages.length > this.props.messages.length ){
      this.setState({
        newMessagesCounter: this.state.newMessagesCounter + (1)
      })
    }

    const messagesData = this.prepareMessages(nextProps.messages.reverse());

    this.setState({
      dataSource: messagesData,
    });

    if ( this.state.autoScroll ){
      this.setState({
        shouldScroll: true,
      });
    }

  }

  scrollToBottom(contentHeight){
    let bottom = contentHeight - this.state.listHeight;
    console.log('scrollToBottom:', bottom);
    this._invertibleScrollViewRef.scrollToOffset({offset: bottom, animated:true});
    if ( this.state.init )
      this.setState({init: false})
  }


  shouldComponentUpdate(nextProps, nextState) {
    if (!shallowequal(this.props, nextProps)) {
      return true;
    }
    if (!shallowequal(this.state, nextState)) {
      return true;
    }
    return false;
  }

  prepareMessages(messages) {

    let tmp = messages.reduce((o, m, i) => {
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

    return tmp
    return {
      keys: messages.map((m) => m._id),
      blob: messages.reduce((o, m, i) => {
        const previousMessage = messages[i + 1] || {};
        const nextMessage = messages[i - 1] || {};
        // add next and previous messages to hash to ensure updates
        const toHash = JSON.stringify(m) + previousMessage._id + nextMessage._id;
        o[m._id] = {
          ...m,
          previousMessage,
          nextMessage,
          hash: md5(toHash),
        };
        return o;
      }, {}),
    };
  }

  scrollTo(options) {
    this._invertibleScrollViewRef.scrollTo(options);
  }
  scrollToEnd(){
    let bottom = this.state.listContentHeight - this.state.listHeight;
    console.log('Scrolling to:', bottom);
    this._invertibleScrollViewRef.scrollToOffset({offset: bottom, animated:true});
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

  renderFooter() {

    if (this.props.renderFooter) {
      const footerProps = {
        ...this.props,
      };
      return this.props.renderFooter(footerProps);
    }
    return null;
  }
  renderHeader() {

    return(
      <View style={{height: 10, backgroundColor: '#FFF'}}></View>
    )

    if (this.props.renderHeader) {
      const headerProps = {
        ...this.props,
      };
      return this.props.renderHeader(footerProps);
    }
    return null;
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
    return
    this.setState({
      listHeight: layout.height
    })
  }
  onOutterViewLayout(e) {
    const { layout } = e.nativeEvent;
    console.log('(onOutterViewLayout) List parent height: ', layout.height);
    this.scrollOffset = this.state.listContentHeight - layout.height;
    return
    this.setState({
      listParentHeight: layout.height,
    })
  }
  onScrollEnd(e) {

    let contentOffset = e.nativeEvent.contentOffset;
    let viewSize = e.nativeEvent.layoutMeasurement;

    console.log('Scroll position:',contentOffset.y);
    this.scrollOffset = contentOffset.y;
    this.setState({
      listScrollPosition: contentOffset.y
    })
  }
  onScroll(e){
    let contentOffset = e.nativeEvent.contentOffset;

    var currentOffset = contentOffset.y;
    var direction = currentOffset > this.scrollOffset ? 'down' : 'up';

    this.scrollOffset = currentOffset;


    if ( this.state.listHeight < this.state.listContentHeight ){

      if ( direction == 'up' && !this.scrollToBottomIconV && this.scrollOffset < 50 ){
        Animated.timing(this.state.opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        this.scrollToBottomIconV = true;
        this.setState({
          autoScroll: false
        })
      }

      if ( direction == 'down' && this.scrollToBottomIconV && this.scrollOffset > 50 ){
        Animated.timing(this.state.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
        this.scrollToBottomIconV = false;
        this.setState({
          newMessagesCounter: 0
        })
      }
    }

  }

  onContentSizeChange(contentWidth, contentHeight){
    console.log('--> onContentSizeChange  <--');
    console.log('List content height: ', contentHeight);
    console.log('Should scroll ? ', this.state.shouldScroll);
    console.log('----------------------------------');
    this.setState({
      listContentHeight: contentHeight,
    });
    this.scrollOffset = contentHeight - this.state.listHeight;

    if ( this.state.autoScroll ){
      if ( this.state.listHeight < contentHeight)
        this.scrollToBottom(contentHeight)
      this.setState({ shouldScroll: false })
    }
  }
  _keyExtractor = (item, index) => {
    return item.hash
  };
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
                              onPress={ () => {this.scrollToBottom(this.state.listContentHeight) } } >
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
  render() {
    const contentContainerStyle = this.props.inverted ? {}
                                      : styles.notInvertedContentContainerStyle;

    return (
      <View onLayout={this.onOutterViewLayout} style={[styles.container,{marginBottom: this.props.inputToolbarHeight}]}>
          {this.scrollToBottomIcon()}
          <FlatList
            keyExtractor={this._keyExtractor}
            data={this.state.dataSource}
            renderItem={this.renderRow}
            onLayout={this.onLayout}
            //onMomentumScrollEnd={this.onScrollEnd}
            onScroll={this.onScroll}
            onScrollEndDrag={this.onScrollEnd}
            onContentSizeChange={this.onContentSizeChange}
            ref={(component) => (this._invertibleScrollViewRef = component)}
            ListFooterComponent={this.renderFooter}
            ListHeaderComponent={this.renderHeader}
            style={{backgroundColor: '#fff'}}
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
