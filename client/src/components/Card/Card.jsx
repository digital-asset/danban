import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Draggable } from "react-beautiful-dnd";
import classnames from "classnames";
import CardModal from "../CardModal/CardModal";
import CardBadges from "../CardBadges/CardBadges";
import { findCheckboxes } from "../utils";
import formatMarkdown from "./formatMarkdown";
import "./Card.scss";

class Card extends Component {
  static propTypes = {
    card: PropTypes.shape({
      _id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      color: PropTypes.string
    }).isRequired,
    assignee: PropTypes.object,
    tags: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired
      })
    ),
    listId: PropTypes.string.isRequired,
    isDraggingOver: PropTypes.bool.isRequired,
    index: PropTypes.number.isRequired,
    isSignedIn: PropTypes.bool.isRequired,
    hasWrite: PropTypes.bool.isRequired,
    filteredUser: PropTypes.string,
    dispatch: PropTypes.func.isRequired
  };

  constructor() {
    super();
    this.state = {
      isModalOpen: false
    };
  }

  toggleCardEditor = () => {
    if (this.props.isSignedIn && this.props.hasWrite) {
      this.setState({ isModalOpen: !this.state.isModalOpen });
    }
  };

  handleClick = event => {
    const { tagName, checked, id } = event.target;
    if (tagName.toLowerCase() === "input") {
      // The id is a string that describes which number in the order of checkboxes this particular checkbox has
      this.toggleCheckbox(checked, parseInt(id, 10));
    } else if (tagName.toLowerCase() !== "a") {
      this.toggleCardEditor(event);
    }
  };

  handleKeyDown = event => {
    // Only open card on enter since spacebar is used by react-beautiful-dnd for keyboard dragging
    if (event.keyCode === 13 && event.target.tagName.toLowerCase() !== "a") {
      event.preventDefault();
      this.toggleCardEditor();
    }
  };

  // identify the clicked checkbox by its index and give it a new checked attribute
  toggleCheckbox = (checked, i) => {
    const { card, dispatch } = this.props;

    let j = 0;
    const newText = card.text.replace(/\[(\s|x)\]/g, match => {
      let newString;
      if (i === j) {
        newString = checked ? "[x]" : "[ ]";
      } else {
        newString = match;
      }
      j += 1;
      return newString;
    });

    dispatch({
      type: "CHANGE_CARD_TEXT",
      payload: { cardId: card._id, cardText: newText }
    });
  };

  render() {    
    const { card, index, listId, isDraggingOver, assignee, tags, hasWrite, filteredUser, filteredTag } = this.props;

    if (!card || (filteredUser && card.assignee !== filteredUser) || (filteredTag && !card.tags.includes(filteredTag))) { return null };
    
    const { isModalOpen } = this.state;
    const checkboxes = findCheckboxes(card.text);
    return (
      <>
        <Draggable draggableId={card._id} index={index} isDragDisabled={!hasWrite} >
          {(provided, snapshot) => (
            <>
              {/* eslint-disable */}
              <div
                className={classnames("card-title", {
                  "card-title--drag": snapshot.isDragging
                })}
                ref={ref => {
                  provided.innerRef(ref);
                  this.ref = ref;
                }}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                onClick={this.handleClick}
                onKeyDown={this.handleKeyDown}
                style={{
                  ...provided.draggableProps.style,
                }}
              >
                <div
                  className={classnames('card-title-html', `color-${card.color ? card.color.replace(/#/ig, '') : ''}`, {
                    'with-border': !!card.color
                  })}
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(card.text)
                  }}
                />
                {/* eslint-enable */}
                {(card.date || checkboxes.total > 0 || assignee || tags) && (
                  <CardBadges date={card.date} checkboxes={checkboxes} assignee={assignee} tags={tags}/>
                )}
              </div>
              {/* Remove placeholder when not dragging over to reduce snapping */}
              {isDraggingOver && provided.placeholder}
            </>
          )}
        </Draggable>
        <CardModal
          isOpen={isModalOpen}
          cardElement={this.ref}
          card={card}
          listId={listId}
          toggleCardEditor={this.toggleCardEditor}
          assignee={assignee}
          tags={tags}
        />
      </>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const isSignedIn = state.user !== null;

  const card = state.cardsById[ownProps.cardId]
  let tags, filteredUser, filteredTag;
  if (card) {
    tags = card.tags ? card.tags.map(tagId => state.tagsById[tagId]) : undefined;
    const board = state.boardsById[card.boardId];
    filteredUser = board.filteredUser;
    filteredTag = board.filteredTag;
  } else { console.log("Card not found", ownProps.cardId) };

  return {
    card,
    tags,
    isSignedIn,
    assignee: card ? state.users.byParty[card.assignee] : undefined,
    filteredUser,
    filteredTag
  }
};

export default connect(mapStateToProps)(Card);
