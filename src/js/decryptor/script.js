$(function() {
    if ($('#decryptBtn').length) {
        $('#decryptBtn').click(function () {
            $('#output').val('');

            const json_string = $('#json-string').val();
            const key = $('#key').val();
            const result = CryptoJSAesJson.decrypt(json_string, key);
            $('#output').val(result);
        });
    }
});
