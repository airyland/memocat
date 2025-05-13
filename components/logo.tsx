interface LogoProps {
  className?: string
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 2C8.268 2 2 8.268 2 16C2 23.732 8.268 30 16 30C23.732 30 30 23.732 30 16C30 8.268 23.732 2 16 2Z"
        fill="black"
      />
      <path
        d="M11 14C12.1046 14 13 13.1046 13 12C13 10.8954 12.1046 10 11 10C9.89543 10 9 10.8954 9 12C9 13.1046 9.89543 14 11 14Z"
        fill="white"
      />
      <path
        d="M21 14C22.1046 14 23 13.1046 23 12C23 10.8954 22.1046 10 21 10C19.8954 10 19 10.8954 19 12C19 13.1046 19.8954 14 21 14Z"
        fill="white"
      />
      <path d="M16 25C18.7614 25 21 22.7614 21 20H11C11 22.7614 13.2386 25 16 25Z" fill="white" />
      <path d="M8 8L4 4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 8L28 4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 18H19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 18C7 18 8 20 10 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 18C25 18 24 20 22 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
