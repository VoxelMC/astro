import assert from 'node:assert/strict';
import { after, describe, before, it } from 'node:test';
import * as cheerio from 'cheerio';
import { fixLineEndings, loadFixture, hasOwnProperty } from './test-utils.js';

describe('Experimental Content Collections cache - references', () => {
	let fixture;
	let devServer;
	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/content-collection-references/',
			experimental: { contentCollectionCache: true },
		});
	});

	after(() => fixture.clean());

	const modes = ['dev', 'prod'];

	for (const mode of modes) {
		describe(mode, () => {
			before(async () => {
				if (mode === 'prod') {
					await fixture.build();
				} else if (mode === 'dev') {
					devServer = await fixture.startDevServer();
				}
			});

			after(async () => {
				if (mode === 'dev') devServer?.stop();
			});

			describe(`JSON result`, () => {
				/*
				 * @type {number}
				 */
				let json;

				before(async () => {
					if (mode === 'prod') {
						const rawJson = await fixture.readFile('/welcome-data.json');
						json = JSON.parse(rawJson);
					} else if (mode === 'dev') {
						const rawJsonResponse = await fixture.fetch('/welcome-data.json');
						const rawJson = await rawJsonResponse.text();
						json = JSON.parse(rawJson);
					}
				});

				it('Returns expected keys', () => {
					json.has;
					assert.ok(hasOwnProperty(json, 'welcomePost'));
					assert.ok(hasOwnProperty(json, 'banner'));
					assert.ok(hasOwnProperty(json, 'author'));
					assert.ok(hasOwnProperty(json, 'relatedPosts'));
				});

				it('Returns `banner` data', () => {
					const { banner } = json;
					assert.ok(hasOwnProperty(banner, 'data'));
					assert.strictEqual(banner.id, 'welcome');
					assert.strictEqual(banner.collection, 'banners');
					assert.strictEqual(
						banner.data.alt,
						'Futuristic landscape with chrome buildings and blue skies'
					);

					assert.strictEqual(banner.data.src.width, 400);
					assert.strictEqual(banner.data.src.height, 225);
					assert.strictEqual(banner.data.src.format, 'jpg');
					assert.ok(banner.data.src.src.includes('the-future'));
				});

				it('Returns `author` data', () => {
					const { author } = json;
					assert.ok(hasOwnProperty(author, 'data'));
					assert.deepStrictEqual(author, {
						id: 'nate-moore',
						collection: 'authors',
						data: {
							name: 'Nate Something Moore',
							twitter: 'https://twitter.com/n_moore',
						},
					});
				});

				it('Returns `relatedPosts` data', () => {
					const { relatedPosts } = json;
					assert.ok(Array.isArray(relatedPosts));
					const topLevelInfo = relatedPosts.map(({ data, body, ...meta }) => ({
						...meta,
						body: fixLineEndings(body).trim(),
					}));
					assert.deepStrictEqual(topLevelInfo, [
						{
							id: 'related-1.md',
							slug: 'related-1',
							body: '# Related post 1\n\nThis is related to the welcome post.',
							collection: 'blog',
						},
						{
							id: 'related-2.md',
							slug: 'related-2',
							body: '# Related post 2\n\nThis is related to the welcome post.',
							collection: 'blog',
						},
					]);
					const postData = relatedPosts.map(({ data }) => data);
					assert.deepStrictEqual(postData, [
						{
							title: 'Related post 1',
							banner: { id: 'welcome', collection: 'banners' },
							author: { id: 'fred-schott', collection: 'authors' },
						},
						{
							title: 'Related post 2',
							banner: { id: 'welcome', collection: 'banners' },
							author: { id: 'ben-holmes', collection: 'authors' },
						},
					]);
				});
			});

			describe(`Render result`, () => {
				let $;
				before(async () => {
					if (mode === 'prod') {
						const html = await fixture.readFile('/welcome/index.html');
						$ = cheerio.load(html);
					} else if (mode === 'dev') {
						const htmlResponse = await fixture.fetch('/welcome');
						const html = await htmlResponse.text();
						$ = cheerio.load(html);
					}
				});

				it('Renders `banner` data', () => {
					const banner = $('img[data-banner]');
					assert.strictEqual(banner.length, 1);
					assert.ok(banner.attr('src').includes('the-future'));
					assert.strictEqual(
						banner.attr('alt'),
						'Futuristic landscape with chrome buildings and blue skies'
					);
					assert.strictEqual(banner.attr('width'), '400');
					assert.strictEqual(banner.attr('height'), '225');
				});

				it('Renders `author` data', () => {
					const author = $('a[data-author-name]');
					assert.strictEqual(author.length, 1);
					assert.strictEqual(author.attr('href'), 'https://twitter.com/n_moore');
					assert.strictEqual(author.text(), 'Nate Something Moore');
				});

				it('Renders `relatedPosts` data', () => {
					const relatedPosts = $('ul[data-related-posts]');
					assert.strictEqual(relatedPosts.length, 1);
					const relatedPost1 = relatedPosts.find('li').eq(0);

					assert.strictEqual(relatedPost1.find('a').attr('href'), '/blog/related-1');
					assert.strictEqual(relatedPost1.find('a').text(), 'Related post 1');
					const relatedPost2 = relatedPosts.find('li').eq(1);
					assert.strictEqual(relatedPost2.find('a').attr('href'), '/blog/related-2');
					assert.strictEqual(relatedPost2.find('a').text(), 'Related post 2');
				});
			});
		});
	}
});
