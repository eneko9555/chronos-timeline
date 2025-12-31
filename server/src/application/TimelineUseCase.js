const Timeline = require('../domain/Timeline');

class TimelineUseCase {
    constructor(timelineRepository) {
        this.timelineRepository = timelineRepository;
    }

    async getUserTimelines(userId) {
        return this.timelineRepository.getByUser(userId);
    }

    async getTimeline(userId, timelineId) {
        return this.timelineRepository.getById(userId, timelineId);
    }

    async createTimeline(userId, name, description = '', coverImage = '', themeId = 'chronos') {
        const timeline = new Timeline({
            userId,
            identifier: name || 'Untitled Timeline',
            description,
            coverImage,
            themeId,
            events: []
        });
        return this.timelineRepository.create(timeline);
    }

    async saveTimeline(userId, timelineId, events, metadata = {}) {
        const existingTimeline = await this.timelineRepository.getById(userId, timelineId);
        if (!existingTimeline) return null;

        existingTimeline.events = events;
        if (metadata.identifier) existingTimeline.identifier = metadata.identifier;
        if (metadata.description !== undefined) existingTimeline.description = metadata.description;
        if (metadata.coverImage !== undefined) existingTimeline.coverImage = metadata.coverImage;
        if (metadata.themeId !== undefined) existingTimeline.themeId = metadata.themeId;

        return this.timelineRepository.update(existingTimeline);
    }

    async deleteTimeline(userId, timelineId) {
        return this.timelineRepository.delete(userId, timelineId);
    }

    async updateTimelineMetadata(userId, timelineId, metadata) {
        const timeline = await this.timelineRepository.getById(userId, timelineId);
        if (!timeline) return null;

        timeline.identifier = metadata.identifier || timeline.identifier;
        timeline.description = metadata.description !== undefined ? metadata.description : timeline.description;
        timeline.coverImage = metadata.coverImage !== undefined ? metadata.coverImage : timeline.coverImage;
        timeline.themeId = metadata.themeId !== undefined ? metadata.themeId : timeline.themeId;

        return this.timelineRepository.update(timeline);
    }
}

module.exports = TimelineUseCase;
