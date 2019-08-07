document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        for(let file of [...document.querySelectorAll('.file')]) {
            let timeLeft = +file.getAttribute('data-time-left')
            timeLeft--

            if(timeLeft <= 0) {
                file.remove()
            } else {
                file.setAttribute('data-time-left', timeLeft)
                file.querySelector('.time').textContent = timeLeft
            }
        }
    }, 1000)
})