import assert from 'node:assert/strict';
import { after, describe, before, it } from 'node:test';
import * as devalue from 'devalue';
import * as cheerio from 'cheerio';
import { loadFixture, hasOwnProperty } from './test-utils.js';
import testAdapter from './test-adapter.js';
import { preventNodeBuiltinDependencyPlugin } from './test-plugins.js';

describe('Experimental Content Collections cache', () => {
	describe('Query', () => {
		let fixture;
		before(async () => {
			fixture = await loadFixture({
				root: './fixtures/content-collections/',
				experimental: { contentCollectionCache: true },
			});
			await fixture.build();
		});

		after(() => fixture.clean());

		describe('Collection', () => {
			let json;
			before(async () => {
				const rawJson = await fixture.readFile('/collections.json');
				json = devalue.parse(rawJson);
			});

			it('Returns `without config` collection', async () => {
				assert.ok(hasOwnProperty(json, 'withoutConfig'));
				assert.ok(Array.isArray(json.withoutConfig));

				const ids = json.withoutConfig.map((item) => item.id).sort();
				assert.deepStrictEqual(
					ids,
					[
						'columbia.md',
						'endeavour.md',
						'enterprise.md',
						// Spaces allowed in IDs
						'promo/launch week.mdx',
					].sort()
				);
			});

			it('Handles spaces in `without config` slugs', async () => {
				assert.ok(hasOwnProperty(json, 'withoutConfig'));
				assert.ok(Array.isArray(json.withoutConfig));

				const slugs = json.withoutConfig.map((item) => item.slug).sort();
				assert.deepStrictEqual(
					slugs,
					[
						'columbia',
						'endeavour',
						'enterprise',
						// "launch week.mdx" is converted to "launch-week.mdx"
						'promo/launch-week',
					].sort()
				);
			});

			it('Returns `with schema` collection', async () => {
				assert.ok(hasOwnProperty(json, 'withSchemaConfig'));
				assert.ok(Array.isArray(json.withSchemaConfig));

				const ids = json.withSchemaConfig.map((item) => item.id).sort();
				const publishedDates = json.withSchemaConfig.map((item) => item.data.publishedAt);

				assert.deepStrictEqual(ids, ['four%.md', 'one.md', 'three.md', 'two.md']);
				assert.ok(
					publishedDates.every((date) => date instanceof Date),
					'Not all publishedAt dates are Date objects'
				);
				assert.deepStrictEqual(publishedDates.map((date) => date.toISOString()).sort(), [
					'2021-01-01T00:00:00.000Z',
					'2021-01-01T00:00:00.000Z',
					'2021-01-02T00:00:00.000Z',
					'2021-01-03T00:00:00.000Z',
				]);
			});

			it('Returns `with custom slugs` collection', async () => {
				assert.ok(hasOwnProperty(json, 'withSlugConfig'));
				assert.ok(Array.isArray(json.withSlugConfig));

				const slugs = json.withSlugConfig.map((item) => item.slug).sort();
				assert.deepStrictEqual(slugs, ['excellent-three', 'fancy-one', 'interesting-two']);
			});

			it('Returns `with union schema` collection', async () => {
				assert.ok(hasOwnProperty(json, 'withUnionSchema'));
				assert.ok(Array.isArray(json.withUnionSchema));

				const post = json.withUnionSchema.find((item) => item.id === 'post.md');
				assert.notStrictEqual(post, undefined);
				assert.deepStrictEqual(post.data, {
					type: 'post',
					title: 'My Post',
					description: 'This is my post',
				});
				const newsletter = json.withUnionSchema.find((item) => item.id === 'newsletter.md');
				assert.notStrictEqual(newsletter, undefined);
				assert.deepStrictEqual(newsletter.data, {
					type: 'newsletter',
					subject: 'My Newsletter',
				});
			});
		});

		describe('Entry', () => {
			let json;
			before(async () => {
				const rawJson = await fixture.readFile('/entries.json');
				json = devalue.parse(rawJson);
			});

			it('Returns `without config` collection entry', async () => {
				assert.ok(hasOwnProperty(json, 'columbiaWithoutConfig'));
				assert.strictEqual(json.columbiaWithoutConfig.id, 'columbia.md');
			});

			it('Returns `with schema` collection entry', async () => {
				assert.ok(hasOwnProperty(json, 'oneWithSchemaConfig'));
				assert.strictEqual(json.oneWithSchemaConfig.id, 'one.md');
				assert.strictEqual(json.oneWithSchemaConfig.data.publishedAt instanceof Date, true);
				assert.strictEqual(
					json.oneWithSchemaConfig.data.publishedAt.toISOString(),
					'2021-01-01T00:00:00.000Z'
				);
			});

			it('Returns `with custom slugs` collection entry', async () => {
				assert.ok(hasOwnProperty(json, 'twoWithSlugConfig'));
				assert.strictEqual(json.twoWithSlugConfig.slug, 'interesting-two');
			});

			it('Returns `with union schema` collection entry', async () => {
				assert.ok(hasOwnProperty(json, 'postWithUnionSchema'));
				assert.strictEqual(json.postWithUnionSchema.id, 'post.md');
				assert.deepStrictEqual(json.postWithUnionSchema.data, {
					type: 'post',
					title: 'My Post',
					description: 'This is my post',
				});
			});
		});
	});

	const blogSlugToContents = {
		'first-post': {
			title: 'First post',
			element: 'blockquote',
			content: 'First post loaded: yes!',
		},
		'second-post': {
			title: 'Second post',
			element: 'blockquote',
			content: 'Second post loaded: yes!',
		},
		'third-post': {
			title: 'Third post',
			element: 'blockquote',
			content: 'Third post loaded: yes!',
		},
		'using-mdx': {
			title: 'Using MDX',
			element: 'a[href="#"]',
			content: 'Embedded component in MDX',
		},
	};

	describe('Static paths integration', () => {
		let fixture;

		before(async () => {
			fixture = await loadFixture({
				root: './fixtures/content-static-paths-integration/',
				experimental: {
					contentCollectionCache: true,
				},
			});
			await fixture.build();
		});

		after(() => fixture.clean());

		it('Generates expected pages', async () => {
			for (const slug in blogSlugToContents) {
				assert.strictEqual(fixture.pathExists(`/posts/${slug}`), true);
			}
		});

		it('Renders titles', async () => {
			for (const slug in blogSlugToContents) {
				const post = await fixture.readFile(`/posts/${slug}/index.html`);
				const $ = cheerio.load(post);
				assert.strictEqual($('h1').text(), blogSlugToContents[slug].title);
			}
		});

		it('Renders content', async () => {
			for (const slug in blogSlugToContents) {
				const post = await fixture.readFile(`/posts/${slug}/index.html`);
				const $ = cheerio.load(post);
				assert.strictEqual(
					$(blogSlugToContents[slug].element).text().trim(),
					blogSlugToContents[slug].content
				);
			}
		});
	});

	describe('With spaces in path', () => {
		it('Does not throw', async () => {
			const fixture = await loadFixture({
				root: './fixtures/content with spaces in folder name/',
				experimental: {
					contentCollectionCache: true,
				},
			});
			let error = null;
			try {
				await fixture.build();
			} catch (e) {
				error = e.message;
			} finally {
				await fixture.clean();
			}
			assert.strictEqual(error, null);
		});
	});
	describe('With config.mjs', () => {
		it("Errors when frontmatter doesn't match schema", async () => {
			const fixture = await loadFixture({
				root: './fixtures/content-collections-with-config-mjs/',
				experimental: {
					contentCollectionCache: true,
				},
			});
			let error;
			try {
				await fixture.build();
			} catch (e) {
				error = e.message;
			} finally {
				await fixture.clean();
			}
			assert.ok(error.includes('**title**: Expected type `"string"`, received "number"'));
		});
	});
	describe('With config.mts', () => {
		it("Errors when frontmatter doesn't match schema", async () => {
			const fixture = await loadFixture({
				root: './fixtures/content-collections-with-config-mts/',
				experimental: {
					contentCollectionCache: true,
				},
			});
			let error;
			try {
				await fixture.build();
			} catch (e) {
				error = e.message;
			} finally {
				await fixture.clean();
			}
			assert.ok(error.includes('**title**: Expected type `"string"`, received "number"'));
		});
	});

	describe('With empty markdown file', () => {
		it('Throws the right error', async () => {
			const fixture = await loadFixture({
				root: './fixtures/content-collections-empty-md-file/',
				experimental: {
					contentCollectionCache: true,
				},
			});
			let error;
			try {
				await fixture.build();
			} catch (e) {
				error = e.message;
			} finally {
				await fixture.clean();
			}
			assert.ok(error.includes('**title**: Required'));
		});
	});

	describe('With empty collections directory', () => {
		it('Handles the empty directory correclty', async () => {
			const fixture = await loadFixture({
				root: './fixtures/content-collections-empty-dir/',
				experimental: {
					contentCollectionCache: true,
				},
			});
			let error;
			try {
				await fixture.build();
			} catch (e) {
				error = e.message;
			} finally {
				await fixture.clean();
			}
			assert.strictEqual(error, undefined);
			// TODO: try to render a page
		});
	});

	describe('SSR integration', () => {
		let app;
		let fixture;

		before(async () => {
			fixture = await loadFixture({
				root: './fixtures/content-ssr-integration/',
				output: 'server',
				adapter: testAdapter(),
				vite: {
					plugins: [preventNodeBuiltinDependencyPlugin()],
				},
				experimental: {
					contentCollectionCache: true,
				},
			});
			await fixture.build();
			app = await fixture.loadTestAdapterApp();
		});

		after(() => fixture.clean());

		it('Responds 200 for expected pages', async () => {
			for (const slug in blogSlugToContents) {
				const request = new Request('http://example.com/posts/' + slug);
				const response = await app.render(request);
				assert.strictEqual(response.status, 200);
			}
		});

		it('Renders titles', async () => {
			for (const slug in blogSlugToContents) {
				const request = new Request('http://example.com/posts/' + slug);
				const response = await app.render(request);
				const body = await response.text();
				const $ = cheerio.load(body);
				assert.strictEqual($('h1').text(), blogSlugToContents[slug].title);
			}
		});

		it('Renders content', async () => {
			for (const slug in blogSlugToContents) {
				const request = new Request('http://example.com/posts/' + slug);
				const response = await app.render(request);
				const body = await response.text();
				const $ = cheerio.load(body);
				assert.strictEqual(
					$(blogSlugToContents[slug].element).text().trim(),
					blogSlugToContents[slug].content
				);
			}
		});
	});

	describe('Base configuration', () => {
		let fixture;

		before(async () => {
			fixture = await loadFixture({
				root: './fixtures/content-collections-base/',
			});
			await fixture.build();
		});

		after(() => fixture.clean());

		it('Includes base in links', async () => {
			const html = await fixture.readFile('/docs/index.html');
			const $ = cheerio.load(html);
			assert.ok($('link').attr('href').startsWith('/docs'));
		});

		it('Includes base in hoisted scripts', async () => {
			const html = await fixture.readFile('/docs/index.html');
			const $ = cheerio.load(html);
			assert.ok($('script').attr('src').startsWith('/docs'));
		});
	});
});
