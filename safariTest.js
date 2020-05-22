
let fileInput = document.getElementById('fileInput')
let fileName
fileInput.onchange = function () {
    let file = this.files[0]
    fileName = file.name


    let fileReader = new FileReader()
    fileReader.onload = function (e) {
        let blob = new Blob([new Int8Array(this.result)]);
        let bloburl = URL.createObjectURL(blob)
        console.warn("bloburl: ", bloburl)
        createDownloadLink(blob,fileName)
    }

    fileReader.readAsArrayBuffer(file)
    fileInput.value = "";  // clear input
};


function createDownloadLink(blob,fileName) {
    var url = URL.createObjectURL(blob);
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');

    //add controls to the <audio> element
    au.controls = true;
    au.src = url;

    //link the a element to the blob
    link.href = url;
    link.download = new Date().toISOString() + fileName;
    link.innerHTML = link.download;

    //add the new audio and a elements to the li element
    li.appendChild(au);
    li.appendChild(link);

    //add the li element to the ordered list
    List.appendChild(li);
}
