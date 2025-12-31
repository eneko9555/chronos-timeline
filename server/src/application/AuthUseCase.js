class AuthUseCase {
    constructor(userRepository, authProvider) {
        this.userRepository = userRepository;
        this.authProvider = authProvider;
    }

    async login(idToken) {
        // 1. Verify token
        const decodedToken = await this.authProvider.verifyToken(idToken);

        // 2. Find or create user
        const user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
            photoURL: decodedToken.picture
        };

        const savedUser = await this.userRepository.save(user);
        return savedUser;
    }
}

module.exports = AuthUseCase;
