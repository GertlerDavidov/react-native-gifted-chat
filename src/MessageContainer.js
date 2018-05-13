/* eslint
    no-console: 0,
    no-param-reassign: 0,
    no-use-before-define: ["error", { "variables": false }],
    no-return-assign: 0,
    react/no-string-refs: 0
*/

import PropTypes from 'prop-types';
import React from 'react';

import { FlatList, View, StyleSheet, Keyboard } from 'react-native';

import shallowequal from 'shallowequal';
import InvertibleScrollView from 'react-native-invertible-scroll-view';
import md5 from 'md5';
import LoadEarlier from './LoadEarlier';
import Message from './Message';

export default class MessageContainer extends React.Component {

  constructor(props) {
    super(props);

    this.renderRow = this.renderRow.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.renderLoadEarlier = this.renderLoadEarlier.bind(this);

    this.onLayout = this.onLayout.bind(this)
    this.onOutterViewLayout = this.onOutterViewLayout.bind(this)

    this.onScrollEnd = this.onScrollEnd.bind(this)

    this.onKeyboardDidShow = this.onKeyboardDidShow.bind(this);
    this.onKeyboardDidHide = this.onKeyboardDidHide.bind(this);
    this.onKeyboardChange = this.onKeyboardChange.bind(this);

    this.onContentSizeChange = this.onContentSizeChange.bind(this);


    const messagesData = this.prepareMessages(props.messages.reverse());
    this.state = {
      dataSource: messagesData,
      listContentHeight: 0,
      listScrollPosition: 0,
      listParentHeight: 0,
      listHeight: 0,

    };
  }
  componentWillMount(){
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.onKeyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.onKeyboardDidHide);
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
    if ( endCoordinates.screenY < startCoordinates.screenY){
      let offset = 0;
      console.log('Keyboard opend');
      console.log('listContentHeight: ' + this.state.listContentHeight);
      console.log('listHeight: ' + this.state.listHeight);
      console.log('---------------------');

      if ( this.state.listContentHeight > this.state.listHeight ){
        if ( this.state.listScrollPosition == this.state.listContentHeight - this.state.listHeight ){
          offset = this.state.listContentHeight - ( this.state.listHeight - endCoordinates.height );
        } else {
          offset = this.state.listContentHeight - ( this.state.listHeight - endCoordinates.height ) - ( (this.state.listContentHeight - this.state.listHeight) - this.state.listScrollPosition );
        }



      } else {
        offset = this.state.listContentHeight - ( this.state.listHeight - endCoordinates.height );
      }

      console.log('Offset: ', offset);

      if ( offset <= 0 )
         offset = 0

      this._invertibleScrollViewRef.scrollToOffset({offset: offset, animated:true});

    } else {

      //this._invertibleScrollViewRef.scrollToOffset({offset: this.state.listPosBeforeKeyboardOpened , animated:true});
    }

  }
  onKeyboardDidShow(e) {
  }
  onKeyboardDidHide(e) {
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.messages === nextProps.messages) {
      return;
    }
    const messagesData = this.prepareMessages(nextProps.messages.reverse());

    this.setState({
      dataSource: messagesData,
    });

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

    return(
      <View style={{height: 2, backgroundColor: '#fff'}}></View>
    )

    if (this.props.renderFooter) {
      const footerProps = {
        ...this.props,
      };
      return this.props.renderFooter(footerProps);
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
    console.log('List height: ', layout.height);
    this.setState({
      listHeight: layout.height
    })
  }
  onOutterViewLayout(e) {
    const { layout } = e.nativeEvent;
    console.log('List parent height: ', layout.height);
    this.setState({
      listParentHeight: layout.height
    })
  }
  onScrollEnd(e) {

    let contentOffset = e.nativeEvent.contentOffset;
    let viewSize = e.nativeEvent.layoutMeasurement;

    console.log('Scroll position:',contentOffset.y);

    this.setState({
      listScrollPosition: contentOffset.y
    })
  }
  onContentSizeChange(contentWidth, contentHeight){
    console.log('List content height: ', contentHeight);
    this.setState({
      listContentHeight: contentHeight
    })
  }
  _keyExtractor = (item, index) => {
    return item.hash
  };

  render() {
    const contentContainerStyle = this.props.inverted
      ? {}
      : styles.notInvertedContentContainerStyle;
    return (
      <View onLayout={this.onOutterViewLayout} style={[styles.container]}>
          <FlatList
            keyExtractor={this._keyExtractor}
            data={this.state.dataSource}
            renderItem={this.renderRow}
            onLayout={this.onLayout}
            onMomentumScrollEnd={this.onScrollEnd}
            onScrollEndDrag={this.onScrollEnd}
            onContentSizeChange={this.onContentSizeChange}
            ref={(component) => (this._invertibleScrollViewRef = component)}
            ListFooterComponent={this.renderFooter}
            style={{backgroundColor: '#fff',
                    marginBottom: this.props.composerHeight,
                    paddingTop:5, paddingBottom: 55}}
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
