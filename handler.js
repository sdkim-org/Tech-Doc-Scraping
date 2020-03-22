const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
const AWS = require('aws-sdk');

const sampleUrls = {
  aws : "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html",
  azure : "https://docs.microsoft.com/en-us/azure/virtual-machines/linux/",
  azureBlog : "https://azure.microsoft.com/en-us/blog/fastai-on-azure-dsvm/",
  googleCloud : "https://cloud.google.com/kubernetes-engine/docs/tutorials/hello-app",
  // towardsDataScience : "https://towardsdatascience.com/the-most-underrated-tool-in-data-science-numpy-68d8fcbde524"
}

const s3 = new AWS.S3();

const main = async (event, context) => {
  let browser = null
  try {
    const { url, cloud } = JSON.parse(event.body)

    browser = await puppeteer.launch({
			// Required
			executablePath: await chromium.executablePath,

			// Optional
			args: chromium.args,
			defaultViewport: chromium.defaultViewport,
			headless: chromium.headless
		});

    const page = await browser.newPage()

    // const cloud = 'azureBlog'
    // const url = sampleUrls[cloud]

    await page.goto(url, { waitUntil: 'networkidle2'})
    
    const cloudSelector = {
      aws : 'div#main-col-body',
      azure : 'main#main',
      azureBlog : 'article',
      googleCloud : 'article.devsite-article-inner',
      // towardsDataScience: ''
    };

    const _sel = cloudSelector[cloud]

    const doc = await page.evaluate((sel) => {
      return document.querySelector(sel).innerHTML
    }, _sel)

    const text = doc.replace(/(\r\n\t|\n|\r\t)/gm, " ")
                    .replace(/\t+/g,"")
                    .replace(/(<([^>]+)>)/ig,"")
                    .replace(/  +/g, ' ').trim()

    const _title = await page.evaluate(() => {
      return document.querySelector('title').innerText
    })
    const [title] = _title.split('|')

    const s3Params = {
      Bucket: 'cloud.doc.hansung.ac.kr',
      Key: `${cloud}_${title}.txt`,
      Body: text,
      ContentType: 'text/plain'
    }
    await s3.putObject(s3Params).promise();
    
  } catch (e) {
    console.log({e})
  } finally {
    browser && await browser.close()
  }
}

module.exports = { main }