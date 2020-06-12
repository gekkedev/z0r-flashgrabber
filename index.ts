import Ask from "https://deno.land/x/ask/mod.ts";

/** the website's base URL; it returns a random gif but that is not exactly what we're  */
let baseURL: string = "http://z0r.de";
/** relative path where to store the downloaded files */
let downloadPath: string = "downloads";
/**
 * index of the latest flashloop (changes are unlikely though)
 * default is 10000 but the first download will update this number
 */
let highestIndex: number = 10000;
/** amount of successfully downloaded flashloops */
let successes: number = 0;
/** amount of flashloops which could not be downloaded */
let failures: number = 0;

//check target directories
try {
  Deno.mkdirSync("downloads");
  //let info: Deno.FileInfo = Deno.statSync(downloadPath); //use this to check for index.html
} catch (err) {
  console.log('folder "' + downloadPath + '" already exists!');
  let result = await Promise.resolve(
    (new Ask()).confirm({ name: "overwrite", message: "Overwrite?" }),
  );
  if (!result.overwrite) Deno.exit();
}

let getHtml = async (index: number) => {
  let result: Response = await fetch(baseURL + "/" + index);
  return await result.text();
};
let getLoop = (index: number, link: string) => {
  return new Promise<void>((resolve: () => void, reject: () => void) => {
    fetch(baseURL + link).then((result: Response) => {
      result.arrayBuffer().then((loop: ArrayBuffer) => {
        let targetPath: string = downloadPath +
          link.slice(link.lastIndexOf("/")); //cuts away the path
        Deno.writeFile(targetPath, new Uint8Array(loop)).then(() => {
          successes++;
          console.log("successfully downloaded flashloop " + index);
          resolve();
        }).catch((err) => {
          failures++;
          console.error("error saving flashloop " + index);
          console.log(err);
          reject();
        });
      }).catch((err) => {
        failures++;
        console.error("error downloading flashloop " + index);
        console.log(err);
        reject();
      });
    });
  });
};

console.log("Initiating z0r.de media download...");
let index = 0;
let downloads: Array<Promise<void>> = [];

//download flashloops
while (index <= highestIndex) {
  let text: string = await getHtml(index);

  //get the highest flashloop number
  if (index == 0) { //lowest loop links to the highest
    let pos1: number = text.search(/<a href="([0-9]*)">.*(Previous)/);
    let temp: string = text.slice(pos1 + 9);
    highestIndex = parseInt(temp.slice(0, temp.indexOf('"')));
    console.log("highest flashloop is " + highestIndex);
    //TODO: store the first page's HTML
  }
  /** TODO: try to recycle the links, assuming that they only differ by one number */
  let linkPos: number = text.search(/src=".*(.swf")/) + 7;
  let link = text.slice(linkPos);
  link = link.slice(0, link.indexOf('"'));
  console.log("downloading flashloop " + index + "...");
  downloads.push(getLoop(index, link));
  index++;
}

//finish execution & print report
Promise.all(downloads).finally(() => {
  console.log("all downloads complete");
  console.log("successful downloads: " + successes);
  console.log("failures: " + failures);
  console.log("total: " + (failures + successes));
});

//TODO: convert into newer formats?
