const SteamCommunity = require('../index.js');
const SteamTotp = require('steam-totp');
const {LoginSession, EAuthTokenPlatformType} = require('steam-session');

const SOCKS_PROXY = 'socks5://username:password@proxyserver:port';
const HTTP_PROXY = 'http://username:password@proxyserver:port';

const ACCOUNT = {
	accountName: 'your_steam_username',
	password: 'your_steam_password',
	sharedSecret: 'your_shared_secret',
	identitySecret: 'your_identity_secret'
};

async function main() {
	const session = new LoginSession(EAuthTokenPlatformType.MobileApp, {
		socksProxy: SOCKS_PROXY,
		// httpProxy: HTTP_PROXY
	});

	const twoFactorCode = SteamTotp.generateAuthCode(ACCOUNT.sharedSecret);
	console.log('2FA code:', twoFactorCode);

	const startResult = await session.startWithCredentials({
		accountName: ACCOUNT.accountName,
		password: ACCOUNT.password,
		steamGuardCode: twoFactorCode
	});

	if (startResult.actionRequired) {
		throw new Error('Additional action required: ' + JSON.stringify(startResult.validActions));
	}

	await new Promise((resolve, reject) => {
		session.on('authenticated', resolve);
		session.on('error', reject);
		session.on('timeout', () => reject(new Error('Login timed out')));
	});

	const cookies = await session.getWebCookies();

	console.log('\n=== Login successful ===');
	console.log('Refresh Token:', session.refreshToken);
	console.log('Access Token: ', session.accessToken);
	console.log('Cookies:');
	cookies.forEach(c => console.log(' ', c));

	// Wire into SteamCommunity for subsequent requests
	const community = new SteamCommunity({proxy: PROXY});
	community.setCookies(cookies);

	community.getSteamUser(community.steamID, (err, user) => {
		if (err) {
			console.error('Profile fetch error:', err.message);
			return;
		}
		console.log('\nLogged in as:', user.name, '|', community.steamID.toString());
	});
}

main().catch(err => {
	console.error('Login failed:', err.message);
	process.exit(1);
});
