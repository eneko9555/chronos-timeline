class Event {
  constructor({ id, title, start, end, color, parentId, isParent, type, order, isMilestone, description, mediaUrl, geo, tags }) {
    this.id = id;
    this.title = title;
    this.start = new Date(start);
    this.end = new Date(end);
    this.color = color;
    this.parentId = parentId;
    this.isParent = isParent;
    this.type = type;
    this.order = order;
    this.isMilestone = isMilestone;
    this.description = description;
    this.mediaUrl = mediaUrl;
    this.geo = geo;
    this.tags = tags || [];
  }
}

module.exports = Event;
