class Timeline {
    constructor({ id, userId, identifier, description = '', coverImage = '', themeId = 'chronos', events = [], notes = [], updatedAt = null }) {
        this.id = id;
        this.userId = userId;
        this.identifier = identifier; // e.g., 'default', or a custom name
        this.description = description;
        this.coverImage = coverImage;
        this.themeId = themeId;
        this.events = events; // Array of Event objects
        this.notes = notes; // Array of Note objects
        this.updatedAt = updatedAt;
    }
}

module.exports = Timeline;
