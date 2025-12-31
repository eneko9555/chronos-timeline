class AuthController {
    constructor(authUseCase) {
        this.authUseCase = authUseCase;
    }

    async login(req, res) {
        try {
            const { idToken } = req.body;
            if (!idToken) {
                return res.status(400).json({ error: 'Missing idToken' });
            }

            const user = await this.authUseCase.login(idToken);
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Authentication failed' });
        }
    }
}

module.exports = AuthController;
