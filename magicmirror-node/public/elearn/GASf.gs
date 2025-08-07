function onFormSubmit(e) {
  var slideTemplateId = "1f1E1O_ERFXhFPFOEc9yZFGEJ47IwZo0vYSS22PRhXCE";
  var colCID = 2;
  var colAfter = 3;
  var colWhatsApp = 4;
  var deviceId = "7359a78750d120b19c13843bc2d5565c";

  var cid = e.values[colCID - 1];
  var afterLink = e.values[colAfter - 1];
  var nomorWa = e.values[colWhatsApp - 1];

  nomorWa = nomorWa.replace('+', '');
  if (nomorWa.charAt(0) == "0") {
    nomorWa = "62" + nomorWa.slice(1);
  }

  var fileId = getDriveIdFromUrl(afterLink);
  if (!fileId) {
    Logger.log("❌ Gagal ambil file ID dari link AFTER: " + afterLink);
    return;
  }

  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();

  var copy = DriveApp.getFileById(slideTemplateId).makeCopy(`After Treatment - ${cid}`);
  var copyId = copy.getId();
  var pres = SlidesApp.openById(copyId);
  var slide = pres.getSlides()[0];

  var images = slide.getImages();
  var replaced = false;
  for (var i = 0; i < images.length; i++) {
    var alt = images[i].getDescription();
    if (alt && alt === "afterImage") {
      var phWidth = images[i].getWidth();
      var phHeight = images[i].getHeight();
      var phX = images[i].getLeft();
      var phY = images[i].getTop();

      images[i].remove();

      var newImage = slide.insertImage(blob);
      var imgWidth = newImage.getWidth();
      var imgHeight = newImage.getHeight();
      var imgRatio = imgWidth / imgHeight;
      var phRatio = phWidth / phHeight;

      // Hitung skala proporsional dan set salah satu dimensi saja
      if (imgRatio > phRatio) {
        // Fit berdasarkan lebar placeholder
        var scaledWidth = phWidth;
        var scaledHeight = scaledWidth / imgRatio;
        newImage.setWidth(scaledWidth);
        // Center vertikal
        newImage.setTop(phY + (phHeight - scaledHeight) / 2);
        newImage.setLeft(phX);
      } else {
        // Fit berdasarkan tinggi placeholder
        var scaledHeight = phHeight;
        var scaledWidth = scaledHeight * imgRatio;
        newImage.setHeight(scaledHeight);
        // Center horizontal
        newImage.setLeft(phX + (phWidth - scaledWidth) / 2);
        newImage.setTop(phY);
      }

      replaced = true;
      Logger.log(`✅ Foto AFTER untuk CID ${cid} dipasang dengan proporsi asli.`);
    }
  }

  if (!replaced) {
    Logger.log("⚠️ Placeholder 'afterImage' tidak ditemukan di slide.");
  }
  pres.saveAndClose();

  var pngUrl = exportSlideAsPNG(copyId);

  var pesan = `Halo, terima kasih sudah berkunjung ke Queen Care. Berikut foto after-treatment Anda 📸\n\n` +
              `Jangan lupa ikuti tips perawatan dari kami agar hasil tetap maksimal. 💇‍♀️✨`;

  sendWhatsAppWhacenter(nomorWa, pesan, pngUrl, deviceId);

  DriveApp.getFileById(copyId).setTrashed(true);
}

function getDriveIdFromUrl(url) {
  var id = null;
  if (url.indexOf("open?id=") > -1) {
    id = url.split("open?id=")[1];
  } else if (url.indexOf("uc?id=") > -1) {
    id = url.split("uc?id=")[1];
  } else {
    var match = url.match(/[-\w]{25,}/);
    if (match) {
      id = match[0];
    }
  }
  if (id && id.indexOf("&") > -1) {
    id = id.split("&")[0];
  }
  return id;
}

function exportSlideAsPNG(presentationId) {
  var presentation = SlidesApp.openById(presentationId);
  var slideId = presentation.getSlides()[0].getObjectId();
  var exportUrl = `https://docs.google.com/presentation/d/${presentationId}/export/png?id=${presentationId}&pageid=${slideId}`;

  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + token }
  });

  var blob = response.getBlob().setName("after-treatment.png");
  var file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return `https://drive.google.com/uc?id=${file.getId()}&export=download`;
}

function sendWhatsAppWhacenter(noWa, pesan, fileUrl, deviceId) {
  var url = "https://app.whacenter.com/api/send";
  var payload = {
    message: pesan,
    number: noWa,
    device_id: deviceId,
    file: fileUrl
  };
  var options = {
    method: "post",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(payload)
  };
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}
