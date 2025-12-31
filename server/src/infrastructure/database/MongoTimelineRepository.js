const TimelineRepository = require('../../domain/TimelineRepository');
const TimelineModel = require('./schemas/TimelineSchema');
const Timeline = require('../../domain/Timeline');
const Event = require('../../domain/Event');

class MongoTimelineRepository extends TimelineRepository {
    async getByUser(userId) {
        const docs = await TimelineModel.find({ userId });
        return docs.map(this._toDomain);
    }

    async getById(userId, timelineId) {
        try {
            const doc = await TimelineModel.findOne({ _id: timelineId, userId });
            if (!doc) return null;
            return this._toDomain(doc);
        } catch (e) {
            return null;
        }
    }

    async create(timeline) {
        const doc = await TimelineModel.create({
            userId: timeline.userId,
            identifier: timeline.identifier,
            description: timeline.description || '',
            coverImage: timeline.coverImage || '',
            themeId: timeline.themeId || 'chronos',
            events: timeline.events
        });
        return this._toDomain(doc);
    }

    async update(timeline) {
        const updateData = {
            events: timeline.events,
            updatedAt: new Date()
        };

        if (timeline.identifier) {
            updateData.identifier = timeline.identifier;
        }
        if (timeline.description !== undefined) {
            updateData.description = timeline.description;
        }
        if (timeline.coverImage !== undefined) {
            updateData.coverImage = timeline.coverImage;
        }
        if (timeline.themeId !== undefined) {
            updateData.themeId = timeline.themeId;
        }

        const doc = await TimelineModel.findOneAndUpdate(
            { _id: timeline.id, userId: timeline.userId },
            updateData,
            { new: true }
        );
        return doc ? this._toDomain(doc) : null;
    }

    async delete(userId, timelineId) {
        const result = await TimelineModel.deleteOne({ _id: timelineId, userId });
        return result.deletedCount > 0;
    }

    _toDomain(doc) {
        return new Timeline({
            id: doc._id.toString(),
            userId: doc.userId,
            identifier: doc.identifier,
            description: doc.description || '',
            coverImage: doc.coverImage || '',
            themeId: doc.themeId || 'chronos',
            events: doc.events.map(e => new Event({
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                color: e.color,
                parentId: e.parentId,
                isParent: e.isParent,
                type: e.type,
                order: e.order,
                isMilestone: e.isMilestone,
                description: e.description,
                mediaUrl: e.mediaUrl,
                geo: e.geo,
                tags: e.tags
            })),
            updatedAt: doc.updatedAt
        });
    }
}

module.exports = MongoTimelineRepository;
