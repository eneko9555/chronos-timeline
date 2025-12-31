class TimelineController {
    constructor(timelineUseCase) {
        this.timelineUseCase = timelineUseCase;
    }

    async createTimeline(req, res) {
        try {
            const userId = req.user.uid;
            const { name, description, coverImage, themeId } = req.body;
            const timeline = await this.timelineUseCase.createTimeline(userId, name, description, coverImage, themeId);
            res.json(timeline);
        } catch (error) {
            console.error("Create Timeline Error:", error);
            if (error.code === 11000) {
                return res.status(400).json({ error: 'Ya existe un timeline con ese nombre.' });
            }
            res.status(500).json({ error: error.message || 'Error interno del servidor' });
        }
    }

    async listTimelines(req, res) {
        try {
            const userId = req.user.uid;
            const timelines = await this.timelineUseCase.getUserTimelines(userId);
            res.json(timelines);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getTimeline(req, res) {
        try {
            const userId = req.user.uid;
            const timelineId = req.params.id;
            const timeline = await this.timelineUseCase.getTimeline(userId, timelineId);

            if (!timeline) {
                return res.status(404).json({ error: 'Timeline not found' });
            }
            res.json(timeline);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async saveTimeline(req, res) {
        try {
            const userId = req.user.uid;
            const timelineId = req.params.id;
            const { events, identifier, description, coverImage, themeId } = req.body;

            if (!events) {
                return res.status(400).json({ error: 'Missing events' });
            }

            const timeline = await this.timelineUseCase.saveTimeline(userId, timelineId, events, { identifier, description, coverImage, themeId });

            if (!timeline) {
                return res.status(404).json({ error: 'Timeline not found' });
            }

            return res.json(timeline);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Server error' });
        }
    }

    async deleteTimeline(req, res) {
        try {
            const userId = req.user.uid;
            const timelineId = req.params.id;
            const deleted = await this.timelineUseCase.deleteTimeline(userId, timelineId);

            if (!deleted) {
                return res.status(404).json({ error: 'Timeline not found' });
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateTimeline(req, res) {
        try {
            const userId = req.user.uid;
            const timelineId = req.params.id;
            const { identifier, description, coverImage, themeId } = req.body;

            const timeline = await this.timelineUseCase.getTimeline(userId, timelineId);
            if (!timeline) {
                return res.status(404).json({ error: 'Timeline not found' });
            }

            timeline.identifier = identifier || timeline.identifier;
            timeline.description = description !== undefined ? description : timeline.description;
            timeline.coverImage = coverImage !== undefined ? coverImage : timeline.coverImage;
            timeline.themeId = themeId !== undefined ? themeId : timeline.themeId;

            const updated = await this.timelineUseCase.updateTimelineMetadata(userId, timelineId, {
                identifier: timeline.identifier,
                description: timeline.description,
                coverImage: timeline.coverImage,
                themeId: timeline.themeId
            });

            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = TimelineController;
